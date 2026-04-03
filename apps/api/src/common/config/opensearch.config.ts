import { registerAs } from '@nestjs/config';

export default registerAs('opensearch', () => ({
  node: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
  username: process.env.OPENSEARCH_USERNAME || 'admin',
  password: process.env.OPENSEARCH_PASSWORD || 'admin',
}));
