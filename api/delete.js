const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const path = 'db.json';
  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

  if (req.method !== 'POST') {
    res.status(405).end('Method Not Allowed');
    return;
  }

  const { key } = req.body;

  try {
    const ghRes = await fetch(apiURL, {
      headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }
    });
    const data = await ghRes.json();
    const content = Buffer.from(data.content, 'base64').toString();
    const json = JSON.parse(content);

    delete json[key];

    const updateRes = await fetch(apiURL, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Delete key ${key}`,
        content: Buffer.from(JSON.stringify(json, null, 2)).toString('base64'),
        sha: data.sha
      })
    });

    if (updateRes.ok) {
      res.status(200).json({ message: 'Deleted' });
    } else {
      const err = await updateRes.json();
      res.status(500).json({ error: 'Failed to delete', detail: err });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error occurred' });
  }
};
