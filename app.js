const nodemailer = require('nodemailer');
const { google } = require('googleapis');

//////////////////////////////////////////

const express = require('express');
const ejs = require('ejs');

const path = require('path');
const File = require("./model/uploader");
const multer = require("multer");

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// join path
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.render('formData');
});

//////////////////////////////////////////

const mongoose = require("mongoose");

process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION, APP SHUTTING NOW!!");
  console.log(err.message, err.name);
  process.exit(1);
});

const DB = "mongodb://localhost:27017/file-system";

mongoose
  .connect(DB, {
    useCreateIndex: true,
    useFindAndModify: true,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    autoIndex: true,
  })
  .then(() => {
    console.log("DB connected successfully");
  });

// multer start here

let dataFileName = "";
const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `files/${file.originalname}`);
    dataFileName = file.originalname;
    console.log(dataFileName);
  },
});

// Multer Filter
const multerFilter = (req, file, cb) => {
  if (file.mimetype.split("/")[1] === "pdf") {
    cb(null, true);
  } else {
    cb(new Error("Not a PDF File!!"), false);
  }
};

//Calling the "multer" Function
const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

////////////////////////////////////////////////////////

// getting user mailelist
// var obj = [];
// async function mailer() {
//   let result = await fetch('http://localhost:5000/user/');   
//   // let data = await result;

//   let data = JSON.stringify(result);
//   let useData = JSON.parse(data);

//   for (let i in useData) {
//     obj.push(useData[i].email)
//   }
//   console.log(obj.toString());
//   // if (!err) {

//   // }

// }
// mailer();

//////////////////////////////////////////


app.post("/send", upload.single("myFile"), (req, res) => {

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// client token are the refresh toke
const REFRESH_TOKEN = process.env.REFRESH_TOKEN;

// authorize the client
const oAuth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// create Credential
oAuth2Client.setCredentials({ refresh_token: REFRESH_TOKEN })

// mail function
async function mailSend() {
    try {
        const accessToken = await oAuth2Client.getAccessToken();

        // transport object
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                type:'oAuth2',
                user: process.env.from, 
                clientId: CLIENT_ID,
                clientSecret: CLIENT_SECRET,
                refreshToken: REFRESH_TOKEN,
                accessToken: accessToken,                
            },
        });

        const mailSender = {
            from: process.env.FROM,
            to: 'xyz@gmail.com',    /* or if we have a user list than the list */
            subject: 'Hello world',
            html: req.body.Body,
            attachments: [
                {
                  filename: dataFileName, path: `./public/files/${dataFileName}`
                }
              ]
        };

        await transporter.sendMail(mailSender, (err, result) => {
            if (err) {
              console.log(err.message);
            } else {
              console.log('email sent', result.response)
            }
          });
          
    } catch(err) {
        return err;
    }
}

mailSend();
});

app.listen(5000, () => {
    console.log('Server is listening at 5000');
})