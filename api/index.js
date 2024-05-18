const express = require("express");
var path = require('path');
const cors = require("cors");
const { default: mongoose } = require("mongoose");
require("dotenv").config();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("./models/User.js");
const Place = require("./models/Place.js");
const Booking = require("./models/Booking.js");
const app = express();
const cookieParser = require("cookie-parser");
const imageDownloader = require("image-downloader");
const multer = require("multer");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "uploads",
        allowed_formats: ["jpg", "jpeg", "png", "gif"],
    },
});

const bcryptSalt = bcrypt.genSaltSync(10);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));
app.use(express.static(path.join(__dirname,'./client/dist')));

const connectDB = async () => {
    // try {
    //     mongoose.set('strictQuery', false);
    //     await mongoose.connect("mongodb+srv://admin:airglobe123@ag-cluster.58vdwse.mongodb.net/airglobe", {
    //         useNewUrlParser: true,
    //         useUnifiedTopology: true,
    //     });
    //     console.log('MongoDB Connected...');
    // } catch (err) {
    //     console.error(err.message);
    //     // make the process fail
    //     process.exit(1);
    // }

    mongoose.set('strictQuery', false);
    // Connect to MongoDB
    mongoose.connect('mongodb+srv://admin:airglobe123@ag-cluster1.rno0037.mongodb.net/?retryWrites=true&w=majority', {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log('Connected to MongoDB');
    }).catch((error) => {
        console.error('MongoDB connection error:', error);
    });
}



connectDB()

app.use(
    cors({
        credentials: true,
        origin: "http://16.170.231.74:5173",
    })
);

function getUserDataFromReq(req) {
    return new Promise((resolve, reject) => {
        jwt.verify(
            req.cookies.token,
            process.env.SECRET_KEY,
            {},
            async (err, userData) => {
                if (err) throw err;
                resolve(userData);
            }
        );
    });
}

app.get("/api/test", (req, res) => {
    res.json("test ok");
});

//Register
app.post("/api/register", async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const userDoc = await User.create({
            name,
            email,
            password: bcrypt.hashSync(password, bcryptSalt),
        });

        res.json({
            success: true,
            userDoc,
        });
    } catch (error) {
        console.log(error); // Log the error for debugging
        res.status(422).json({ error: "Registration failed" });
    }
});

//Login
app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    const userDoc = await User.findOne({ email });

    if (userDoc) {
        const passOk = bcrypt.compareSync(password, userDoc.password);
        if (passOk) {
            jwt.sign(
                { email: userDoc.email, id: userDoc._id },
                process.env.SECRET_KEY,
                {},
                (err, token) => {
                    if (err) throw err;
                    res.cookie("token", token).json(userDoc);
                }
            );
        } else {
            res.status(422).json("Pass not ok ");
        }
    } else {
        res.json("User not found");
    }
});

//Profile
app.get("/api/profile", (req, res) => {
    const { token } = req.cookies;
    if (token) {
        jwt.verify(token, process.env.SECRET_KEY, {}, async (err, userData) => {
            if (err) throw err;
            const { name, email, _id } = await User.findById(userData.id);
            res.json({ name, email, _id });
        });
    } else {
        res.json(null);
    }
});

//Logout
app.post("/api/logout", (req, res) => {
    res.cookie("token", "").json(true);
});

//Photo Upload by link
app.post("/api/upload-by-link", async (req, res) => {
    const { link } = req.body;
    try{
        const result = await cloudinary.uploader.upload(link , {
            folder : "upload" , 
            allowed_formats : ["jpg" , "jpeg" , "png" , "gif"]
        })
        res.json(result.secure_url)
    }catch(error){
        res.status(500).json({ error: "Failed to upload image to Cloudinary" });
    }
});
// app.post("/upload-by-link", async (req, res) => {
//     const { link } = req.body;
//     const newName = "photo" + Date.now() + ".jpg";
//     await imageDownloader.image({
//         url: link,
//         dest: __dirname + "/uploads/" + newName,
//     });
//     res.json(newName);
// });

// Upload photo from device
const photosMiddleware = multer({ storage: storage }).array("photos" , 100);
app.post("/api/upload", photosMiddleware, (req, res) => {
    const uploadedFiles = [];
    for (let index = 0; index < req.files.length; index++) {
        uploadedFiles.push(req.files[index].path);
    }
    res.json(uploadedFiles);
});

// const photosMiddleware = multer({ dest: "uploads/" });
// app.post("/upload", photosMiddleware.array("photos", 100), (req, res) => {
//     const uploadedFiles = [];
//     for (let index = 0; index < req.files.length; index++) {
//         const { path, originalname } = req.files[index];
//         const parts = originalname.split(".");
//         const ext = parts[parts.length - 1];
//         let new_path = path + "." + ext;
//         fs.renameSync(path, new_path);
//         new_path = new_path.replace(/uploads/g, "");
//         uploadedFiles.push(new_path);
//     }
//     res.json(uploadedFiles);
// });

//Upload place details
app.post("/api/places", async (req, res) => {
    try {
        const { token } = req.cookies;
        const {
            title,
            description,
            address,
            addedPhotos,
            perks,
            extraInfo,
            checkIn,
            checkOut,
            maxGuests,
            price,
        } = req.body;

        // Verify the JWT token for authentication
        jwt.verify(token, process.env.SECRET_KEY, async (err, userData) => {
            if (err) {
                res.status(401).json({ error: "Unauthorized" });
                return; // Exit the function
            }

            // Create a new place document
            const placeDoc = await Place.create({
                owner: userData.id,
                title,
                description,
                address,
                photos: addedPhotos,
                perks,
                extraInfo,
                checkIn,
                checkOut,
                maxGuests,
                price,
            });

            res.json(placeDoc);
        });
    } catch (error) {
        console.log(error); // Log the error for debugging
        res.status(500).json({ error: "Internal server error" });
    }
});

//Fetch places on users
app.get("/api/user-places", async (req, res) => {
    const { token } = req.cookies;
    jwt.verify(token, process.env.SECRET_KEY, {}, async (err, userData) => {
        if (err) throw err;
        const id = userData.id;
        res.json(await Place.find({ owner: id }));
    });
});

//Get place by id
app.get("/api/places/:id", async (req, res) => {
    const { id } = req.params;
    res.json(await Place.findById(id));
});

// Update place
app.put("/api/places/", async (req, res) => {
    const { token } = req.cookies;
    const {
        id,
        title,
        description,
        address,
        addedPhotos,
        perks,
        extraInfo,
        checkIn,
        checkOut,
        maxGuests,
        price,
    } = await req.body;
    jwt.verify(token, process.env.SECRET_KEY, {}, async (err, userData) => {
        if (err) throw err;
        const placeDoc = await Place.findById(id);
        if (userData.id === placeDoc.owner.toString()) {
            placeDoc.set({
                title,
                description,
                address,
                photos: addedPhotos,
                perks,
                extraInfo,
                checkIn,
                checkOut,
                maxGuests,
                price,
            });
            await placeDoc.save();
            res.json("ok");
        }
    });
});

app.get("/api/places", async (req, res) => {
    res.json(await Place.find());
});

//Book places
app.post("/api/bookings", async (req, res) => {
    const { checkIn, checkOut, name, phone, place, price, guests } = req.body;
    const userData = await getUserDataFromReq(req);
    Booking.create({
        checkIn,
        checkOut,
        name,
        phone,
        place,
        price,
        guests,
        user: userData.id,
    })
        .then((doc) => {
            res.json(doc);
        })
        .catch((err) => {
            throw err;
        });
});

//Fetch Places
app.get("/api/bookings", async (req, res) => {
    const userData = await getUserDataFromReq(req);
    res.json(await Booking.find({ user: userData.id }).populate("place"));
});

app.listen(4000);
