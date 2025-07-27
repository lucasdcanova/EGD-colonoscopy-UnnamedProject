import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import UploadPage from './pages/UploadPage.tsx';
import AnnotationPage from './pages/AnnotationPage.tsx';
import DatasetPage from './pages/DatasetPage.tsx';
import Layout from './components/Layout.tsx';
import './App.css';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/annotate/:imageId" element={<AnnotationPage />} />
          <Route path="/dataset" element={<DatasetPage />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </Router>
  );
}

export default App;