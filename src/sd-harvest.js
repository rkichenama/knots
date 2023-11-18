const fs = require('fs');

function stdout(msg) {
  process.stdout.clearLine(0);
  process.stdout.write(`\r${msg}`);
}

// const startDir = {
//   name: 'colab',
//   path: '/mnt/d/stable-diffusion-generated/',
// };
const startDir = {
  name: 'stable-diffusion-generated',
  path: '/mnt/d/',
};

const folders = [startDir];
const textFiles = [];
// const prompts = new Map();

// go through and find all the text files
while(folders.length) {
  const fldr = folders.shift();
  stdout(`looking through ${fldr.path}${fldr.name}/`);
  for (const content of fs.readdirSync(`${fldr.path}${fldr.name}/`, { withFileTypes: true })) {
    if (content.isDirectory() && !/(rundiffusion)/.test(content.name)) {
      folders.push(content);
      continue;
    }
    if (
      content.isFile() &&
      content.name.endsWith('.txt') &&
      !content.name.startsWith('grid-')
    ) {
      textFiles.push(`${content.path}${content.name}`);
    }
  }
}

const strm = fs.createWriteStream('./sd-harvest-raw.txt');

/*
    "sd_model", "outpath_samples", "outpath_grids", "prompt_for_display", "prompt", "negative_prompt", "styles", "seed", "subseed_strength", "subseed",
    "seed_resize_from_h", "seed_resize_from_w", "sampler_index", "sampler_name", "batch_size", "n_iter", "steps", "cfg_scale", "width", "height",
    "restore_faces", "tiling", "do_not_save_samples", "do_not_save_grid"
*/
const xlate = {
  model: (str) => ([['--sd_model', `"${str}"`]]),
  face_restoration: () => ([['--restore_faces', 'true']]),
  size: (str) => {
    const [width, height] = str.split('x');
    return [
      ['--width', width],
      ['--height', height],
    ];
  },
  variation_seed: '--subseed',
  variation_seed_strength: '--subseed_strength',
  model_hash: () => ([[]]),
  sampler: (str) => ([['--sampler_name', `"${str}"`]]),
  seed_resize_from: (str) => {
    const [width, height] = str.split('x');
    return [
      ['--seed_resize_from_w', width],
      ['--seed_resize_from_h', height],
    ];
  },
}

function shorten(str) {
  str = str.substr(`${startDir.path}${startDir.name}/`.length);
  return str.length > 50
    ? `${str.substr(0,15)}...${str.substr(str.length - 32)}`
    : str;
}

stdout(`\rfound ${textFiles.length} text files\n`);

let count = 0;

// go through text files and find the prompts
for (const file of textFiles.sort()) {
  const content = fs.readFileSync(file, { encoding: 'utf-8' });
  if (/^--/.test(content)) { continue; }
  const lines = content.split('\n');
  if (lines.length < 3 || lines.length > 4) { continue; }
  stdout(`\rprocessing ${shorten(file)}`);
  let [
    prompt, negative, meta,
  ] = lines.map(line => line.replaceAll(/\r/g, '').trim());
  if (!meta) { meta = negative; negative = ''; }

  const detail = {
    '--prompt': `"${prompt}"`,
    '--negative_prompt': `"${negative.substr('Negative prompt: '.length)}"`,
    ...meta.split(', ').reduce((acc, curr) => {
      let [key, value] = curr.split(': ');
      key = key.replaceAll(/ /g, '_').toLowerCase();
      if (/^(controlnet|style|version)/.test(key)) { return acc; }
      const xlation = xlate[key];
      if (xlation) {
        if (typeof xlation === 'function') {
          for (const [k, v] of xlation(value)) {
            k && (acc[k] = v);
          }
        }
        if (typeof xlation === 'string') {
          acc[xlation] = value;
        }
      } else {
        acc[`--${key}`] = value;
      }
      return acc;
    }, {})
  };

  // console.log(detail);
  strm.write(`${Object.entries(detail)
    .reduce((acc, [key, vaule]) => (`${acc} ${key} ${vaule}`), '')}\n`);
  // const current = prompts.get(prompt) ?? {};
  // current[detail['--seed']] = detail;
  // prompts.set(prompt, current);
  count++;
}

strm.end();

stdout(`\r${count} prompts saved\n`);
// const oneLine = (prompts) => {
//   return Object.entries(prompts).reduce((lins, [seed, detail]) => {
//     return `${lins}\t${seed}\n\t\t${
//       Object.entries(detail)
//         .reduce((acc, [key, vaule]) => (`${acc} ${key} ${vaule}`), '')
//     }\n`;
//   }, '');
// };

// stdout(`\rwriting ${prompts.size} prompts to file\n`);

// const stream = fs.createWriteStream('./sd-harvest.txt');
// // let fileStr = '';
// for (const key of prompts.keys()) {
//   stream.write(`${key}\n${oneLine(prompts.get(key))}\n\n`);
//   // fileStr += `${key}\n${oneLine(prompts.get(key))}\n\n`;
// }
// stream.end();
// fs.writeFileSync('./sd-harvest.txt', fileStr, { encoding: 'utf-8' });

stdout('done\n');
