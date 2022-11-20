import * as dotenv from "dotenv";
dotenv.config();

import { writeFileSync } from "fs";

import { expect, it, describe, expectTypeOf } from "vitest";
import { Book } from "../src/Book";
import type { ebookMark } from "../src/types/book";
import Storytel from "../src/index";

// ⚙ Test settings
const excludeDownloads = true; // Excludes downloading the ebook and abook tests
//

describe.concurrent("User", async () => {
	if (!process.env.EMAIL || !process.env.PASSWORD) throw new Error("Make sure you have a .env in root with your EMAIL and PASSWORD");

	const client = new Storytel();
	const user = await client.signIn(process.env.EMAIL, process.env.PASSWORD);

	it("context.user should be logged in and refreshToken and singleSignToken should be set", () => {
		expect(user.LoginResponse.accountInfo.loginStatus).not.toEqual(-1);
		expect(user.getSingleSignToken()).not.toBeNull();
		expect(user.getJWT).not.toBeNull();
	})

	it("should get the users bookshelf", async () => {
		const bookshelf = await user.getBookshelf();
		expect(bookshelf[0]).toBeInstanceOf(Book);
	})

	it("should get the users account info", async () => {
		const accountInfo = await user.getAccountInfo();
		expect(accountInfo.id).toBeDefined();
	})

	it("should log in using user1's token", async () => {
		const user2 = await client.signInUsingSingleSignToken(user.getSingleSignToken());
		expect(user2.LoginResponse.accountInfo.loginStatus).not.toEqual(-1);
	})

	describe.concurrent("Book", async () => {
		const bookshelf = await user.getBookshelf();
		const book = bookshelf[0];

		it("should have JWT, SST and kidsMode from user", () => {
			// @ts-ignore
			expect(book.JWT).toEqual(user.getJWT());
			// @ts-ignore
			expect(book.kidsMode).toEqual(false);
			// @ts-ignore
			expect(book.token).toEqual(user.getSingleSignToken());
		})

		it("should return the book details", async () => {
			const details = await book.getBookDetails();
			expect(details).toBeDefined();
		})

		it("should return the average book rating", async () => {
			const averageRating = await book.getAverageRating();
			expect(averageRating).toBeDefined();
		})

		describe("ebook", () => {
			it.skipIf(excludeDownloads)("should return an arraybuffer that can be converted to the books epub file", async () => {
				const ebook = await book.getEBook();

				// You have to manually test if this is a valid ebook
				// But assuming you haven't touched the getEBook() file
				writeFileSync("./tests/ebook.epub", Buffer.from(ebook));

				expectTypeOf(ebook).toMatchTypeOf<ArrayBuffer>;
			})

			it("should get the ebookmark", () => {
				const bookmark = book.getEBookmark();
				expectTypeOf(bookmark).toMatchTypeOf<ebookMark>;
			})

			it("should set a bookmark at position 1000 and getBookmark should have that value", async () => {
				const POSITION = 1000;
				const setBookmark = await book.setEBookmark(POSITION);
				const getBookmark = await book.getEBookmark();

				expect(setBookmark.position).toEqual(getBookmark.position);
			})
		})

		describe("audiobook", async () => {
			it.skipIf(excludeDownloads)("should return an arraybuffer of the audiobook as mp3", async () => {
				const downloadBuffer = await book.downloadAudiobook();

				writeFileSync("./tests/abook.mp3", Buffer.from(downloadBuffer));
			})
		})
	})
})