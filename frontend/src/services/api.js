import axios from 'axios';
import { API_BASE_URL } from './config';

// Base URL is read from .env (dev) or .env.production (prod)
// To switch environments, just update those files — never change this file.
const API = axios.create({
  baseURL: API_BASE_URL,
});

export default API;