import React, { useState, useCallback } from 'react';
import { Upload, List, Input, Button, Card, Spin, Alert, Typography, Space } from 'antd';
import { InboxOutlined, CopyOutlined, ClearOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Dragger } = Upload;
const { Title, Paragraph, Text } = Typography;

// Helper function to convert file to base64 for the API call
const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    // Return only the base64 part
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = (error) => reject(error);
  });

// Helper function to handle API requests with retry logic for 503 errors
const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    const response = await fetch(url, options);
    if (response.status !== 503) {
      return response;
    }
    const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
    console.log(`Attempt ${i + 1} failed with 503. Retrying in ${delay.toFixed(0)}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`The model is overloaded. Please try again later after ${retries} attempts.`);
};


const App = () => {
  const [fileList, setFileList] = useState([]);
  const [listingDetails, setListingDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  // Re-added the API key state to be managed by user input for compatibility.
  const [apiKey, setApiKey] = useState('');

  const handleImageChange = ({ fileList: newFileList }) => {
    setFileList(newFileList);
    setError('');
    setListingDetails(null);
  };

  const handleClearImages = () => {
    setFileList([]);
  };

  const generateListing = useCallback(async () => {
    if (fileList.length === 0) {
      setError('Please upload at least one image.');
      return;
    }
    // The API key is now checked from the user input field again.
    if (!apiKey) {
        setError('Please enter your Google AI API Key.');
        return;
    }

    setIsLoading(true);
    setError('');
    setListingDetails(null);
    setProgress('Converting images...');

    let rawApiResponse = ''; // Variable to hold the raw AI response for debugging

    try {
      const base64Promises = fileList.map(file => getBase64(file.originFileObj));
      const base64ImagesData = await Promise.all(base64Promises);

      const imageParts = base64ImagesData.map((data, index) => ({
        inlineData: {
          mimeType: fileList[index].type,
          data: data,
        },
      }));

      setProgress('Analyzing images with AI...');

      const geminiApiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: "Identify the item shown in these images. Provide a concise, one-sentence description suitable for an eBay title. Also, provide a longer, detailed description for the eBay listing body, highlighting key features visible across all images. Finally, suggest 5-7 relevant keywords for eBay search. Format the output as a JSON object with keys: 'title', 'description', 'keywords'." },
              ...imageParts,
            ],
          },
        ],
      };

      const response = await fetchWithRetry(geminiApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => response.text());
        let userMessage = `API Error: ${response.status}.`;
        if (response.status === 400) userMessage += " The request was invalid. This can happen with corrupted images.";
        if (response.status === 403) userMessage += " Permission denied. Please check if your API key is correct and has the Gemini API enabled in your Google Cloud project.";
        if (response.status === 429) userMessage += " You have exceeded your API quota. Please check your usage limits.";
        
        throw new Error(`${userMessage}\nServer response: ${JSON.stringify(errorBody, null, 2)}`);
      }
      
      const result = await response.json();
      
      if (!result.candidates || !result.candidates[0].content.parts[0].text) {
          throw new Error('Unexpected response structure from Gemini API.');
      }

      rawApiResponse = result.candidates[0].content.parts[0].text;
      let cleanedText = rawApiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const itemInfo = JSON.parse(cleanedText);
      
      const { title, description, keywords } = itemInfo;

      setProgress('Image analysis complete. Generating listing details...');

      const mockCategory = "Collectables > Photographic Equipment > Vintage Photography";
      const mockPrice = (Math.random() * 50 + 25).toFixed(2);

      setListingDetails({
        title: title,
        description: description,
        category: mockCategory,
        price: mockPrice,
        keywords: Array.isArray(keywords) ? keywords.join(', ') : keywords,
      });

    } catch (err) {
      console.error(err);
      if (err instanceof SyntaxError) {
        setError(`Failed to parse the AI's response. This usually means the AI couldn't identify the item clearly. Raw response received:\n\n${rawApiResponse}`);
      } else {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      setProgress('');
    }
  }, [fileList, apiKey]);

  const copyToClipboard = (text) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif', padding: '24px', maxWidth: '1200px', margin: 'auto', backgroundColor: '#f0f2f5' }}>
      <style>{`
        @import url('https://cdnjs.cloudflare.com/ajax/libs/antd/5.12.2/reset.min.css');
        .ant-upload-list { display: none; }
        .error-message { white-space: pre-wrap; word-break: break-all; }
      `}</style>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <Title level={2}>SpicyLister</Title>
        <Paragraph type="secondary">Upload one or more images to automatically generate an eBay listing with a competitive price.</Paragraph>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Alert
          message="Important Security Notice"
          description={
            <span>
              For testing, you can enter your API key below. Before deploying your site to Netlify, you MUST remove the input field and securely store your key as an{' '}
              <a href="https://docs.netlify.com/environment-variables/get-started/" target="_blank" rel="noopener noreferrer">
                Environment Variable
              </a>
              {' '}to prevent it from being stolen.
            </span>
          }
          type="warning"
          showIcon
          icon={<InfoCircleOutlined />}
          style={{ marginBottom: '24px' }}
        />
        <Space direction="vertical" style={{ width: '100%', marginBottom: '16px' }}>
            <Text>Enter your Google AI API Key:</Text>
            <Input 
                placeholder="Your Google AI API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
            />
        </Space>
        <Dragger
          name="file"
          multiple={true}
          fileList={fileList}
          onChange={handleImageChange}
          beforeUpload={() => false}
          style={{ marginBottom: '16px' }}
        >
          {fileList.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', padding: '10px' }}>
              {fileList.map(file => (
                <img 
                  key={file.uid}
                  src={URL.createObjectURL(file.originFileObj)}
                  alt={file.name}
                  style={{ height: '100px', width: '100px', objectFit: 'cover', borderRadius: '8px' }} 
                  onLoad={e => URL.revokeObjectURL(e.target.src)}
                />
              ))}
            </div>
          ) : (
            <>
              <p className="ant-upload-drag-icon"><InboxOutlined /></p>
              <p className="ant-upload-text">Click or drag files to this area to upload</p>
              <p className="ant-upload-hint">Supports multiple JPG or PNG files, max 2MB each.</p>
            </>
          )}
        </Dragger>
        <Space style={{width: '100%'}}>
            <Button type="primary" onClick={generateListing} disabled={fileList.length === 0 || isLoading} block size="large" style={{flexGrow: 1}}>
              {isLoading ? 'Generating...' : 'Generate eBay Listing'}
            </Button>
            <Button icon={<ClearOutlined />} onClick={handleClearImages} disabled={fileList.length === 0 || isLoading} size="large">
                Clear
            </Button>
        </Space>
      </Card>
      
      {isLoading && (
        <div style={{ textAlign: 'center', margin: '20px 0' }}>
          <Spin size="large" />
          <Paragraph style={{ marginTop: '10px' }}>{progress}</Paragraph>
        </div>
      )}

      {error && <Alert message={<div className="error-message">{error}</div>} type="error" showIcon style={{ marginBottom: '24px' }} />}

      {listingDetails && (
        <Card title="Generated eBay Listing">
            <List itemLayout="horizontal">
                <List.Item actions={[<Button icon={<CopyOutlined />} onClick={() => copyToClipboard(listingDetails.title)}>Copy</Button>]}>
                    <List.Item.Meta title="Title" description={<Paragraph style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{listingDetails.title}</Paragraph>} />
                </List.Item>
                <List.Item actions={[<Button icon={<CopyOutlined />} onClick={() => copyToClipboard(listingDetails.description)}>Copy</Button>]}>
                    <List.Item.Meta title="Description" description={<Paragraph style={{ whiteSpace: 'pre-wrap' }}>{listingDetails.description}</Paragraph>} />
                </List.Item>
                <List.Item>
                    <List.Item.Meta title="Category" description={listingDetails.category} />
                </List.Item>
                <List.Item>
                     <List.Item.Meta title="Price (Buy It Now)" description={`£${listingDetails.price}`} />
                </List.Item>
                 <List.Item>
                     <List.Item.Meta title="Offer" description="Make an Offer enabled" />
                </List.Item>
                 <List.Item>
                     <List.Item.Meta title="Postage" description="Free UK post by Royal Mail 48 Tracked" />
                </List.Item>
                 <List.Item actions={[<Button icon={<CopyOutlined />} onClick={() => copyToClipboard(listingDetails.keywords)}>Copy</Button>]}>
                    <List.Item.Meta title="Keywords" description={listingDetails.keywords} />
                </List.Item>
            </List>
        </Card>
      )}
    </div>
  );
};

export default App;
