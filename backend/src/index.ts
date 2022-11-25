import express from "express";
import { resolve } from "path";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import rsa from "./rsa.js";
import kyber from "./kyber.js";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const port = 5050;
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "http://localhost:5173",
	},
});

let clientPublicKey = "";

app.use(express.json());
app.use(cors());

app.use(express.static(resolve("../frontend/dist")));
app.use("/api/users", userRoutes);

app.get("/api", (req, res) => {
	res.sendStatus(200);
});

io.on("connection", (socket) => {
	// console.log("User Connected", socket);
	socket.on("SETUP_RSA", () => {
		rsa.initKeys();

		io.emit("PUBLIC_KEY_RSA", rsa.getPublicKey());

		socket.on("RSA_MESSAGE", (msg: Buffer) => {
			console.log("Message received RSA:", rsa.decrypt(msg));
		});

		socket.on("CLIENT_PUBLIC_KEY", (key: Buffer) => {
			clientPublicKey = `-----BEGIN PUBLIC KEY-----\n${key.toString(
				"base64"
			)}\n-----END PUBLIC KEY-----`;
			socket.emit(
				"RSA_MESSAGE",
				rsa.encrypt("Wassup my guy", clientPublicKey)
			);
		});
	});

	socket.on("SETUP_KYBER", async () => {
		await kyber.initKeys();

		io.emit("PUBLIC_KEY_KYBER", kyber.getPublicKey());

		socket.on("CIPHER_TEXT", async (ct: Uint8Array) => {
			await kyber.decrypt(ct);
			// console.log("Secret", kyber.getSharedSecret());

			socket.emit(
				"AES_MESSAGE",
				kyber.encryptMessage("Waddap my home dawg")
			);
		});
	});

	socket.on("MESSAGE", (msg) => {
		console.log("Message:", msg);
	});
});

server.listen(port, async () => {
	await mongoose.connect("mongodb://localhost/casino");
	console.log(`listening on http://localhost:${port}`);
});

// console.log(publicKey);
// console.log(privateKey);

// console.log(encryptedData.toString("base64"));

// const decryptedData = crypto.privateDecrypt(
// 	{
// 		key: privateKey,
// 		padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
// 		oaepHash: "sha256",
// 	},
// 	encryptedData
// );

// console.log(decryptedData.toString());