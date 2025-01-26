import { mockBody } from "./mockBody";

export const mockBodyHandle = async (req, res) => {
  const { uri } = req.query;

  const type = uri.split('/').pop();

  const mockData = await mockBody(type);

  if (type === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.write(JSON.stringify(mockData));
  } else if (type === 'formData') {
    res.setHeader(
      'Content-Type',
      `multipart/form-data; boundary=${mockData.boundary}`,
    );
    res.write(mockData.formData);
  } else if (type === 'file') {
    res.setHeader('Content-Type', 'text/plain');
    res.write(mockData);
  } else if (type === 'png') {
    res.setHeader('Content-Type', 'image/png');
    res.write(mockData);
  }
  res.end();
};
