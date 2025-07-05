const fetch = require('node-fetch');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const { path, newItem } = req.body;

  if (!path || !newItem) return res.status(400).json({ error: "Missing path or newItem" });

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
    const json = JSON.parse(Buffer.from(data.content, 'base64').toString());

    // Add new item
    json[newItem.key] = newItem;

    // Update file on GitHub
    const updateRes = await fetch(apiURL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: "application/vnd.github+json"
      },
      body: JSON.stringify({
        message: `Add key ${newItem.key}`,
        content: Buffer.from(JSON.stringify(json, null, 2)).toString('base64'),
        sha: data.sha
      })
    });

    if (updateRes.ok) res.status(200).json({ message: 'Success add' });
    else {
      const err = await updateRes.json();
      res.status(500).json({ error: 'Failed to add', detail: err });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error occurred' });
  }
};
