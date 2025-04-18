import * as fs from "fs";
import * as fsPromises from "fs/promises";
import { expectAssignable, expectType } from "./utilities";

// FileBlob
expectType<ReadableStream<Uint8Array>>(Bun.file("index.test-d.ts").stream());
expectType<Promise<ArrayBuffer>>(Bun.file("index.test-d.ts").arrayBuffer());
expectType<Promise<Uint8Array>>(Bun.file("index.test-d.ts").bytes());
expectType<Promise<string>>(Bun.file("index.test-d.ts").text());

expectType<number>(Bun.file("index.test-d.ts").size);
expectType<string>(Bun.file("index.test-d.ts").type);

// Hash
expectType<string>(new Bun.MD4().update("test").digest("hex"));
expectType<string>(new Bun.MD5().update("test").digest("hex"));
expectType<string>(new Bun.SHA1().update("test").digest("hex"));
expectType<string>(new Bun.SHA224().update("test").digest("hex"));
expectType<string>(new Bun.SHA256().update("test").digest("hex"));
expectType<string>(new Bun.SHA384().update("test").digest("hex"));
expectType<string>(new Bun.SHA512().update("test").digest("hex"));
expectType<string>(new Bun.SHA512_256().update("test").digest("hex"));

// Zlib Functions
expectType<Uint8Array>(Bun.deflateSync(new Uint8Array(128)));
expectType<Uint8Array>(Bun.gzipSync(new Uint8Array(128)));
expectType<Uint8Array>(
  Bun.deflateSync(new Uint8Array(128), {
    level: -1,
    memLevel: 8,
    strategy: 0,
    windowBits: 15,
  }),
);
expectType<Uint8Array>(Bun.gzipSync(new Uint8Array(128), { level: 9, memLevel: 6, windowBits: 27 }));
expectType<Uint8Array>(Bun.inflateSync(new Uint8Array(64))); // Pretend this is DEFLATE compressed data
expectType<Uint8Array>(Bun.gunzipSync(new Uint8Array(64))); // Pretend this is GZIP compressed data
expectAssignable<Bun.ZlibCompressionOptions>({ windowBits: -11 });

// Other
expectType<Promise<number>>(Bun.write("test.json", "lol"));
expectType<Promise<number>>(Bun.write("test.json", new ArrayBuffer(32)));
expectType<URL>(Bun.pathToFileURL("/foo/bar.txt"));
expectType<string>(Bun.fileURLToPath(new URL("file:///foo/bar.txt")));

// Testing ../fs.d.ts
expectType<string>(fs.readFileSync("./index.d.ts", { encoding: "utf-8" }).toString());
expectType<boolean>(fs.existsSync("./index.d.ts"));
expectType<void>(fs.accessSync("./index.d.ts"));
expectType<void>(fs.appendFileSync("./index.d.ts", "test"));
expectType<void>(fs.mkdirSync("./index.d.ts"));

// Testing ^promises.d.ts
expectType<string>((await fsPromises.readFile("./index.d.ts", { encoding: "utf-8" })).toString());
expectType<Promise<void>>(fsPromises.access("./index.d.ts"));
expectType<Promise<void>>(fsPromises.appendFile("./index.d.ts", "test"));
expectType<Promise<void>>(fsPromises.mkdir("./index.d.ts"));

Bun.env;

Bun.version;

setImmediate;
clearImmediate;
setInterval;
clearInterval;
setTimeout;
clearTimeout;

const arg = new AbortSignal();
arg;

const e = new CustomEvent("asdf");
console.log(e);

exports;
module.exports;

global.AbortController;
global.Bun;

const er = new DOMException();
er.name;
er.HIERARCHY_REQUEST_ERR;

new Request(new Request("https://example.com"), {});
new Request("", { method: "POST" });

Bun.sleepSync(1); // sleep for 1 ms (not recommended)
await Bun.sleep(1); // sleep for 1 ms (recommended)

Blob;
WebSocket;
Request;
Response;
Headers;
FormData;
URL;
URLSearchParams;
ReadableStream;
WritableStream;
TransformStream;
ByteLengthQueuingStrategy;
CountQueuingStrategy;
TextEncoder;
TextDecoder;
ReadableStreamDefaultReader;
ReadableStreamBYOBReader;
ReadableStreamDefaultController;
ReadableByteStreamController;
WritableStreamDefaultWriter;

declare function stuff(arg: Blob): any;
declare function stuff(arg: WebSocket): any;
declare function stuff(arg: Request): any;
declare function stuff(arg: Response): any;
declare function stuff(arg: Headers): any;
declare function stuff(arg: FormData): any;
declare function stuff(arg: URL): any;
declare function stuff(arg: URLSearchParams): any;
declare function stuff(arg: ReadableStream): any;
declare function stuff(arg: WritableStream): any;
declare function stuff(arg: TransformStream): any;
declare function stuff(arg: ByteLengthQueuingStrategy): any;
declare function stuff(arg: CountQueuingStrategy): any;
declare function stuff(arg: TextEncoder): any;
declare function stuff(arg: TextDecoder): any;
declare function stuff(arg: ReadableStreamDefaultReader): any;
declare function stuff(arg: ReadableStreamDefaultController): any;
declare function stuff(arg: WritableStreamDefaultWriter): any;

stuff("asdf" as any as Blob);

new ReadableStream();
new WritableStream();
new Worker("asdfasdf");
new Worker("asdfasdf").onmessage;
new File([{} as Blob], "asdf");
new Crypto();
new ShadowRealm();
new ErrorEvent("asdf");
new CloseEvent("asdf");
new MessageEvent("asdf");
new CustomEvent("asdf");
// new Loader();

const readableStream = new ReadableStream();
const writableStream = new WritableStream();

{
  const a = new ByteLengthQueuingStrategy({ highWaterMark: 0 });
  a.highWaterMark;
}
{
  const a = new ReadableStreamDefaultController();
  a.close();
}
{
  const a = new ReadableStreamDefaultReader(readableStream);
  await a.cancel();
}
{
  const a = new WritableStreamDefaultController();
  a.error();
}
{
  const a = new WritableStreamDefaultWriter(writableStream);
  await a.close();
}
{
  const a = new TransformStream();
  a.readable;
}
{
  const a = new TransformStreamDefaultController();
  a.enqueue("asdf");
}
{
  const a = new CountQueuingStrategy({ highWaterMark: 0 });
  a.highWaterMark;
}
{
  const a = new DOMException();
  a.DATA_CLONE_ERR;
}
{
  const a = new SubtleCrypto();
  await a.decrypt("asdf", new CryptoKey(), new Uint8Array());
}
{
  const a = new CryptoKey();
  a.algorithm;
}
{
  const a = new BuildError();
  a.level;
}
{
  const a = new ResolveError();
  a.level;
}
{
  const a = new AbortController();
  a;
}
{
  const a = new AbortSignal();
  a.aborted;
}
{
  const a = new Request("asdf");
  await a.json();
  a.cache;
}
{
  const a = new Response();
  await a.text();
  a.ok;
}
{
  const a = new FormData();
  a.delete("asdf");
  a.get("asdf");
  a.append("asdf", "asdf");
  a.set("asdf", "asdf");
  a.forEach((value, key) => {
    console.log(value, key);
  });
  a.entries();
  a.get("asdf");
  a.getAll("asdf");
  a.has("asdf");
  a.keys();
  a.values();
  a.toString();
}
{
  const a = new Headers();
  a.append("asdf", "asdf");
}
{
  const a = new EventTarget();
  a.dispatchEvent(new Event("asdf"));
}
{
  const a = new Event("asdf");
  a.bubbles;
  a.composedPath()[0];
}
{
  const a = new Blob();
  a.size;
}
{
  const a = new File(["asdf"], "stuff.txt ");
  a.name;
}
{
  performance.now();
}
{
  const a = new URL("asdf");
  a.host;
  a.href;
}
{
  new URLSearchParams();
  new URLSearchParams("");
  new URLSearchParams([]);
}
{
  const a = new TextDecoder();
  a.decode(new Uint8Array());
}
{
  const a = new TextEncoder();
  a.encode("asdf");
}
{
  const a = new BroadcastChannel("stuff");
  a.close();
}
{
  const a = new MessageChannel();
  a.port1;
  new MessageChannel().port1.addEventListener("message", console.log);
}
{
  const a = new MessagePort();
  a.close();
}

{
  var a!: RequestInit;
  a.mode;
  a.credentials;
}
{
  var b!: ResponseInit;
  b.status;
}
{
  const ws = new WebSocket("ws://www.host.com/path");
  ws.send("asdf");

  new WebSocket("url", {
    headers: { "Authorization": "my key" },
  });
}

atob("asf");
btoa("asdf");

setInterval(() => {}, 1000);
setTimeout(() => {}, 1000);
clearInterval(1);
clearTimeout(1);
setImmediate(() => {});
clearImmediate(1);

const err = new Error("test");
err.cause = "asdf";
err.cause = new Error("asdf");
err.cause = new RangeError("asdf");
err.cause = new TypeError("asdf");
err.cause = new URIError("asdf");

expectType<unknown>(err.cause);
expectType<typeof Error>().is<ErrorConstructor>();

new Error("asdf", {
  cause: "asdf",
});

new Error("asdf", {
  cause: new Error("asdf"),
});
