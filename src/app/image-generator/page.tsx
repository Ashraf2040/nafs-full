'use client';

import { useState } from 'react';

export default function DiagramTesterPage() {
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoading(true);
    setImage(null);

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      
      if (data.success) {
        // Construct the data URL for immediate rendering
        setImage(`data:image/jpeg;base64,${data.imageBase64}`);
      } else {
        alert(data.error || 'Failed to generate diagram');
      }
    } catch (error) {
      console.error(error);
      alert('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Diagram Generator Test</h1>
        <p className="text-gray-500">
          Paste an AI prompt from your CSV to test the output of the Imagen 3 model.
        </p>
      </div>

      <div className="space-y-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Image Prompt
          </label>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            rows={5}
            placeholder="e.g., Create an educational diagram for Math Grade 6..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-lg transition-colors flex justify-center items-center"
        >
          {loading ? (
            <span className="flex items-center space-x-2">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Generating Diagram...</span>
            </span>
          ) : (
            'Generate Diagram'
          )}
        </button>
      </div>

      {image && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-900">Result:</h2>
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={image} 
              alt="Generated Educational Diagram" 
              className="max-w-full h-auto rounded-lg shadow-sm"
            />
          </div>
        </div>
      )}
    </div>
  );
}