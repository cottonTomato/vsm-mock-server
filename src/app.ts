import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// ***********************************************************************
// ****                         DATA                                  ****
// ***********************************************************************

const news = [
  'Cotard Delusion: This is a rare psychiatric disorder where a person believes they are dead, do not exist, or have lost their internal organs.',

  'The Capuchin Catacombs of Palermo: In Palermo, Italy, there is a macabre catacomb that houses thousands of mummies, including monks, priests, and common people.',

  'The Toynbee Tiles: Mysterious tiles with strange messages have been found embedded in the asphalt of streets in various cities. The origin and purpose of these tiles remain unknown, and they often contain cryptic messages about resurrection and Jupiter.',

  'Vantablack: Known as the darkest material on Earth, Vantablack absorbs 99.965% of visible light, creating an eerie and almost two-dimensional appearance.',

  'The Dyatlov Pass Incident: In 1959, nine experienced hikers mysteriously died in the Ural Mountains of Russia. Their tent was found ripped from the inside, and some were found without proper clothing.',
];

// ***********************************************************************
// ****                  GAME & SERVER CONFIG                         ****
// ***********************************************************************

const Stages = ['TRADING_STAGE', 'CALCULATION_STAGE'] as const;
type StageEnum = (typeof Stages)[number];

const initialGameRoundNo = 0;
const initialGameStage: StageEnum = 'TRADING_STAGE';
const defaultFirstStage: StageEnum = 'TRADING_STAGE';

// Time is in Seconds
const stageDurations: Record<StageEnum, number> = {
  TRADING_STAGE: 5 * 60, // 5 minutes
  CALCULATION_STAGE: 1 * 60, // 1 minute
};

const gameRunTime = 3 * 60 * 60; // 3 hours
const endTime = getUnixTime() + gameRunTime;

const port = process.env.PORT ?? 8080; // For Express

// ***********************************************************************
// ****                    UTIL FUNCTION                              ****
// ***********************************************************************

export function getUnixTime() {
  return +new Date();
}

function chanceOfFailure(n: number) {
  return Math.random() * 10 < n;
}

// ***********************************************************************
// ****               STATE RELATED LOGIC DO NOT TOUCH                ****
// ***********************************************************************

let roundChanged: boolean = true;

const state = {
  roundNo: initialGameRoundNo,
  stage: initialGameStage as StageEnum,
};

function getNextStage(currentStage: StageEnum) {
  const currentIndex = Stages.indexOf(currentStage);
  const nextStage = (currentIndex + 1) % Stages.length;
  return Stages[nextStage];
}

function incrementStage() {
  roundChanged = false;
  state.stage = getNextStage(state.stage);
  if (state.stage === defaultFirstStage) {
    state.roundNo++;
    roundChanged = true;
  }
}

function getGameLoop(io: Server) {
  return function gameLoop() {
    const now = getUnixTime();

    if (now > endTime) io.emit('game:end');
    else {
      const currentStage = state.stage;
      const stageDuration = stageDurations[currentStage];

      io.emit(`game:stage:${state.stage}`);
      if (roundChanged) io.emit('game:round', news);

      setTimeout(() => {
        incrementStage();
        gameLoop();
      }, stageDuration * 1000);
    }
  };
}

// ***********************************************************************
// ****                         EXPRESS                               ****
// ***********************************************************************

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.status(200).send('<h1>Hello, World</h1>');
});

app.post('/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({
      status: 'Failure',
      data: {
        err: 'Wrong Email or Password',
      },
    });
    return;
  }
  res.status(201).json({
    status: 'Success',
    data: {
      token: 'token',
    },
  });
});

// ***********************************************************************
// ****                        SOCKET.IO                              ****
// ***********************************************************************

const server = createServer(app);
const io = new Server(server);
const gameLoop = getGameLoop(io);

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token !== 'token') {
    next(new Error('Invalid Token'));
    return;
  }
  next();
});

io.on('connection', (socket) => {
  socket.on('game:buy', (args, callback) => {
    const { stock, amount } = args;
    if (!stock || !amount) {
      callback({
        status: 'Failure',
        data: {
          err: 'Stock Name or Amount Invalid',
        },
      });
      return;
    }
    if (chanceOfFailure(2)) {
      callback({
        status: 'Failure',
        data: {
          err: 'Not Enough Money',
        },
      });
      return;
    }
    callback({
      status: 'Success',
      data: {
        msg: `${amount} of ${stock} bought`,
      },
    });
  });

  socket.on('game:sell', (args, callback) => {
    const { stock, amount } = args;
    if (!stock || !amount) {
      callback({
        status: 'Failure',
        data: {
          err: 'Stock Name or Amount Invalid',
        },
      });
      return;
    }
    callback({
      status: 'Success',
      data: {
        msg: `${amount} of ${stock} sold`,
      },
    });
  });

  socket.on('game:insider', (callback) => {
    if (chanceOfFailure(5)) {
      callback({
        status: 'Failure',
        data: {
          err: '"Insider Trading" already used.',
        },
      });
      return;
    }
    callback({
      status: 'Success',
      data: {
        news: news[Math.floor(Math.random() * news.length)],
      },
    });
  });

  socket.on('game:muft', (callback) => {
    if (chanceOfFailure(5)) {
      callback({
        status: 'Failure',
        data: {
          err: '"Muft ka Paisa" already used.',
        },
      });
      return;
    }
    callback({
      status: 'Success',
      data: {
        msg: '"Muft ka Paisa" used successfully',
      },
    });
  });
});

// ***********************************************************************
// ****                     START SERVER                              ****
// ***********************************************************************

server.listen(port, () =>
  console.log(`Server is Listening on Port ${port}...`),
);
io.emit('game:start');
gameLoop();
