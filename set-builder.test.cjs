const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');

function setup(storage = new Map()) {
  const html = fs.readFileSync(require('node:path').join(__dirname, 'index.html'), 'utf8');
  const dom = new JSDOM(html);
  let factory;
  const downloads = [];
  const context = {
    Blob,
    URL: { createObjectURL: blob => { downloads.push({ blob }); return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout: callback => callback(),
    document: { addEventListener: (_, callback) => callback(), body: { appendChild() {} },
      createElement: () => ({ click() { downloads.at(-1).filename = this.download; }, remove() {} }) },
    Alpine: { data: (_, callback) => { factory = callback; } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    DOMParser: dom.window.DOMParser,
    confirm: () => true,
  };
  vm.runInNewContext(dom.window.document.querySelector('body > script').textContent, context);
  const app = factory();
  app.init();
  return { app, storage, downloads };
}
const track = { id: '1', name: 'Track, "One"', artist: 'Artist', totalTime: 300, activeDuration: 240, avgBpm: 120 };

test('adds selections, permits repeated entries, adjusts BPM and persists order', () => {
  const { app, storage } = setup();
  app.tracks = { '1': track };
  app.performanceBpm = 128;
  app.selectedTrackIds = ['1'];
  app.addToSet();
  assert.equal(app.setDuration, 225);
  assert.equal(app.selectedTrackIds.length, 0);
  app.selectedTrackIds = ['1'];
  app.addToSet();
  app.setPlayedBpm(0, '160');
  assert.equal(app.setTrackDuration(app.setlist[0]), 180);
  app.startSetDrag({ dataTransfer: { setData() {} } }, 0);
  app.dropSetTrack(1);
  assert.equal(app.setlist[1].playedBpm, 160);
  const restored = setup(storage).app;
  assert.equal(restored.fileLoaded, false);
  assert.equal(restored.setlist.length, 2);
  assert.equal(restored.setlist[1].playedBpm, 160);
  restored.moveSetTrack(restored.setlist[1].key, -1);
  assert.equal(restored.setlist[0].playedBpm, 160);
  restored.removeSetTrack(restored.setlist[0].key);
  assert.equal(restored.setlist.length, 1);
  restored.clearSet();
  assert.equal(setup(storage).app.setlist.length, 0);
});

test('blank/invalid played BPM and missing source BPM use native duration', () => {
  const { app } = setup();
  app.tracks = { '1': track };
  app.selectedTrackIds = ['1'];
  app.addToSet();
  for (const value of ['', '-1', 'Infinity', 'invalid']) {
    app.setPlayedBpm(0, value);
    assert.equal(app.setDuration, 240);
  }
  app.setlist[0].track.avgBpm = 0;
  app.setPlayedBpm(0, '140');
  assert.equal(app.setDuration, 240);
});

test('CSV escapes quotes, newlines and formulas; text has cumulative timings', () => {
  const { app } = setup();
  app.tracks = { '1': track, '2': { ...track, id: '2', name: '=FORMULA\nTitle' } };
  app.selectedTrackIds = ['1', '2'];
  app.addToSet();
  const csv = app.buildSetExport('csv');
  assert.ok(csv.includes('"Track, ""One"""'));
  assert.ok(csv.includes('"\'=FORMULA\nTitle"'));
  assert.ok(csv.includes('"3:45","3:45"'));
  const txt = app.buildSetExport('txt');
  assert.ok(txt.includes('2. =FORMULA Title'));
  assert.ok(txt.includes('Total: 7:30 (2 tracks)'));
});

test('corrupt or unavailable storage is nonfatal', () => {
  const { app } = setup(new Map([['mixtime-set-v1', '{']]));
  assert.equal(app.setlist.length, 0);
  assert.ok(app.storageError);
  const failing = new Map();
  failing.set = () => { throw new Error('Quota'); };
  const second = setup(failing).app;
  second.saveSet();
  assert.ok(second.storageError);
});

test('existing XML parser and selection summaries still work without changing a saved set', () => {
  const { app } = setup();
  const xml = '<DJ_PLAYLISTS><COLLECTION><TRACK TrackID="1" Name="Example" TotalTime="300" AverageBpm="120"><POSITION_MARK Type="0" Num="-1" Start="30"/><POSITION_MARK Type="4" Num="-1" Start="270"/></TRACK></COLLECTION><PLAYLISTS><NODE Type="0" Name="ROOT"><NODE Type="1" Name="Playlist"><TRACK Key="1"/><TRACK Key="1"/></NODE></NODE></PLAYLISTS></DJ_PLAYLISTS>';
  app.parseXml(xml);
  app.selectPlaylist(app.flatTree[0]);
  assert.equal(app.currentTracks.length, 2);
  app.toggleSelectAll();
  assert.equal(app.nativeDuration, 240);
  assert.equal(app.perfDuration, 225);
  app.addToSet();
  app.parseXml(xml);
  assert.equal(app.setlist.length, 1);
  assert.equal(app.setDuration, 225);
});

test('export creates CSV and text downloads with the expected content', async () => {
  const { app, downloads } = setup();
  app.tracks = { '1': track };
  app.selectedTrackIds = ['1'];
  app.addToSet();
  for (const format of ['csv', 'txt']) {
    app.exportFormat = format;
    app.exportSet();
    const download = downloads.at(-1);
    assert.equal(download.filename, `mixtime-set.${format}`);
    assert.equal(await download.blob.text(), app.buildSetExport(format));
  }
});
