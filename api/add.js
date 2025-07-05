const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const { path, newItem } = req.body;

  if (!path || !newItem) {
    return res.status(400).json({ error: "Missing path or newItem" });
  }

  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

  try {
    // Ambil isi file json sekarang
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
      } catch (parseErr) {
        console.error("Gagal parse JSON:", parseErr);
        return res.status(500).json({ error: "Failed to parse existing JSON" });
      }
    }

    // Tambahkan item baru (langsung object, jangan di-stringify)
    json[newItem.key] = newItem;

    // Encode JSON jadi base64 (Buffer)
    const updatedContent = Buffer.from(JSON.stringify(json, null, 2)).toString('base64');

    // Kirim PUT request ke GitHub untuk update file
    const updateRes = await fetch(apiURL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: `Add key ${newItem.key}`,
        content: updatedContent,
        sha: data.sha
      })
    });

    if (updateRes.ok) {
      res.status(200).json({ message: 'Success add' });
    } else {
      const err = await updateRes.json();
      console.error("Failed to update GitHub:", err);
      res.status(500).json({ error: 'Failed to add', detail: err });
    }
  } catch (err) {
    console.error("Unexpected error:", err);
    res.status(500).json({ error: 'Error occurred' });
  }
};
