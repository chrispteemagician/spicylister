import React, { useState, useEffect } from 'react';
import { SpicyListerGlobalFeature } from './components/GlobalFeature';
import './App.css';

function App() {
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Initialize app
    setIsLoading(false);
  }, []);

  const handleAddItem = (item) => {
    setItems(prevItems => [...prevItems, item]);
  };

  const handleRemoveItem = (itemId) => {
    setItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🌶️ SpicyLister</h1>
        <p>Turn your ADHD doom piles into cash!</p>
      </header>

      <main className="App-main">
        {/* Global Currency Feature */}
        <SpicyListerGlobalFeature />

        {/* Your existing app content */}
        <div className="container mx-auto px-4 py-8">
          {isLoading ? (
            <div className="text-center">
              <p>Loading...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Add your existing components here */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Your Items</h2>
                {items.length === 0 ? (
                  <p className="text-gray-600">No items yet. Start decluttering!</p>
                ) : (
                  <div className="grid gap-4">
                    {items.map(item => (
                      <div key={item.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold">{item.name}</h3>
                        <p className="text-gray-600">{item.description}</p>
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="mt-2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Item Form */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-4">Add New Item</h2>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target);
                  const newItem = {
                    id: Date.now(),
                    name: formData.get('itemName'),
                    description: formData.get('itemDescription')
                  };
                  handleAddItem(newItem);
                  e.target.reset();
                }}>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">
                        Item Name
                      </label>
                      <input
                        type="text"
                        id="itemName"
                        name="itemName"
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="itemDescription" className="block text-sm font-medium text-gray-700">
                        Description
                      </label>
                      <textarea
                        id="itemDescription"
                        name="itemDescription"
                        rows={3}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      Add Item
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="App-footer bg-gray-100 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            &copy; 2025 SpicyLister. Turn your clutter into cash worldwide! 🌍
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;