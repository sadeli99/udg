const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const { path, title, message } = req.body;

  if (!path || !title || !message) {
    return res.status(400).json({ error: "Missing path, title, or message" });
  }

  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

  try {
    // Get current content
    const ghRes = await fetch(apiURL, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json"
      }
    });
    const data = await ghRes.json();

    let json = {};
    if (data.content) {
      try {
        json = JSON.parse(Buffer.from(data.content, 'base64').toString());
      } catch (e) {
        console.warn("File kosong atau rusak, pakai default {}");
        json = {};
      }
    }

    // Tambahkan data baru
    const waktu = new Date().toLocaleString();
    const key = pushGetKey();
    json[key] = { androidId: waktu, title, message, key };

    // Update file di GitHub
    const contentBase64 = Buffer.from(JSON.stringify(json, null, 2)).toString('base64');

    const updateRes = await fetch(apiURL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: `Add key ${key}`,
        content: contentBase64,
        sha: data.sha
      })
    });

    if (updateRes.ok) {
      res.status(200).json({ message: 'Success add', key, waktu });
    } else {
      const err = await updateRes.json();
      console.error('Failed to update GitHub:', err);
      res.status(500).json({ error: 'Failed to add', detail: err });
    }
  } catch (e) {
    console.error('Unexpected error:', e);
    res.status(500).json({ error: 'Error occurred' });
  }
};

// fungsi random key sama seperti frontend
function pushGetKey(length=16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let key = "_github-";
  for(let i=0;i<length;i++) {
    key += chars.charAt(Math.floor(Math.random()*chars.length));
  }
  return key;
}
