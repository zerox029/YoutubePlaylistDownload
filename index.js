const path = require('path');
const fs = require('fs');
const readline = require('readline');
const https = require('https');
const youtubedl = require('youtube-dl');
const extractAudio = require('ffmpeg-extract-audio');
const ffmetadata = require("ffmetadata");

const urlRegex = /https:\/\/www.youtube.com\/playlist\?list=.+/;
const _url = process.argv[2];
const _directory = process.argv[3];

let currentId = 0;

const mp4tomp3 = async (mp4Path, mp3Path) => {
  await extractAudio({
    input: mp4Path,
    output: mp3Path
  });
}

const getThumbnail = (url, dir) => {
  const file = fs.createWriteStream(dir);
  const req = https.get(url, (res) => {
    res.pipe(file);
  })
}

const setMetadata = (file, thumbnail) => {
  var data = {
    attachments: [thumbnail]
  };
  
  ffmetadata.write(file, data, (err) => {
    if(err) throw err;
  });
}

const removeIllegalCharacters = (title) => {
  return title
    .replace(/\:/g, ";")
    .replace(/\</g, "(")
    .replace(/\>/g, ")")
    .replace(/\"/g, "'")
    .replace(/\//g, " - ")
    .replace(/\\/g, " - ")
    .replace(/\|/g, " - ")
    .replace(/\?/g, ".")
    .replace(/\*/g, " + ");
}

const playlist = async (url) => {
  'use strict'
  const video = youtubedl(url);

  video.on('error', (err) => {
    console.log('error 2:', err);
  });

  let size = 0;
  let title = '';
  let dir = '';
  let thumbUrl = '';
  let thumbPath = '';
  video.on('info', (info) => {
    size = info.size;
    title = removeIllegalCharacters(info.title);
    thumbUrl = info.thumbnail
    dir = path.join(_directory + '/', title + '.mp4');
    video.pipe(fs.createWriteStream(dir));


    if (!fs.existsSync(_directory + '/thumbnails/')){
      fs.mkdirSync(_directory + '/thumbnails/');
    }
    thumbPath = path.join(_directory + '/thumbnails/', title + '.jpg');
    getThumbnail(thumbUrl, thumbPath);
  });

  let pos = 0;
  video.on('data', (chunk) => {
    pos += chunk.length;
    if(size) {
      let percent = (pos / size * 100).toFixed(2);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.clearLine(1);
      process.stdout.write(percent + '%');
    }
  });

  currentId++;
  video.on('end', async () => {
    var newPath = path.join(_directory + '/', currentId + ' - ' + title + '.mp3');
    
    await mp4tomp3(dir, newPath);
    setMetadata(newPath, thumbPath)
    fs.unlink(dir, (err) => {
      if(err) throw err;
    });
  });

  video.on('next', playlist);
}


if(!_url.match(urlRegex))
{
  console.log("Le lien fournit ne correspond pas à une playlist youtube");
  process.exit();
}
if(!fs.existsSync(_directory))
{
  console.log(`Le dossier spécifié - ${_directory} - est inexistant...`);
  process.exit();
}

console.log("Analyse des vidéos...");
playlist(_url);
