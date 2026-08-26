import axios from 'axios';

// Single Centralized Base URL Setup
const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // Endpoints-ku Common Base URL
});

export default API;