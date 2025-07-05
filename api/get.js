const fetch = require('node-fetch');

module.exports = async (req, res) => {
  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const { path } = req.query;
  if (!path) return res.status(400).json({ error: "Missing path" });

  const apiURL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;

  try {
    const ghRes = await fetch(apiURL, { headers: { Authorization: `Bearer ${GITHUB_TOKEN}` } });
    const data = await ghRes.json();
    const content = Buffer.from(data.content, 'base64').toString();
    res.status(200).json({ content: JSON.parse(content), sha: data.sha });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get data' });
  }
};
