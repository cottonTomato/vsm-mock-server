import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import helmet from 'helmet';

const port = process.env.PORT ?? 8080;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(helmet());
app.use(cors());

app.get('/', (req, res) => {
  res.status(200).send('<h1>Hello, World</h1>');
});

const server = app.listen(port, () =>
  console.log(`Server is Listening on Port ${port}...`),
);

export { app, server };
