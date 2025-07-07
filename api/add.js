const fetch = require('node-fetch');

// fungsi base64 encode/decode
function encode(s) { return Buffer.from(unescape(encodeURIComponent(s))).toString('base64'); }
function decode(s) { return decodeURIComponent(escape(Buffer.from(s, 'base64').toString())); }

// buat key random
function pushGetKey(length=16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "_github-";
  for (let i = 0; i < length; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const { path, newItem } = req.body;

  if (!path || !newItem) {
    return res.status(400).json({ error: "Missing path or newItem" });
  }

  if (!newItem.title || !newItem.message) {
    return res.status(400).json({ error: "Missing title or message in newItem" });
  }

  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const key = pushGetKey();
  const waktu = new Date().toLocaleString();

  try {
    // ambil file JSON
    const ghRes = await fetch(apiURL, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });

    if (!ghRes.ok) {
      const err = await ghRes.text();
      console.error("Failed to fetch existing file:", err);
      return res.status(500).json({ error: "Failed to fetch existing file", detail: err });
    }

    const data = await ghRes.json();

    let json = {};
    try {
      json = JSON.parse(decode(data.content));
    } catch (parseErr) {
      console.warn("File kosong/rusak, pakai default {}");
      json = {};
    }

    // Tambah data baru
    json[key] = { 
      androidId: waktu, 
      title: newItem.title, 
      message: newItem.message, 
      key 
    };

    const updatedContent = encode(JSON.stringify(json, null, 2));

    // Update file ke GitHub
    const updateRes = await fetch(apiURL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: `add key ${key}`,
        content: updatedContent,
        sha: data.sha
      })
    });

    if (updateRes.ok) {
      res.status(200).json({ message: "Success add!", key });
    } else {
      const err = await updateRes.text();
      console.error("Failed to update GitHub:", err);
      res.status(500).json({ error: "Failed to add", detail: err });
    }

  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: "Unexpected error", detail: err.toString() });
  }
};
