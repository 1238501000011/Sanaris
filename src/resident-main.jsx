import React from 'react';
import { createRoot } from 'react-dom/client';
import ResidentApp from './ResidentApp';
import './styles.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><ResidentApp /></React.StrictMode>);
