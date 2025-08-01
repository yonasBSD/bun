import { expect, it } from "bun:test";
import { join, resolve } from "path";

function resolveFrom(from) {
  return specifier => import.meta.resolveSync(specifier, from);
}

it.todo("#imports", async () => {
  const baz = import.meta.resolveSync("#foo", join(import.meta.resolveSync("package-json-imports/baz"), "../"));
  expect(baz).toBe(resolve(import.meta.dir, "node_modules/package-json-imports/foo/private-foo.js"));

  const subpath = import.meta.resolveSync("#foo/bar", join(import.meta.resolveSync("package-json-imports/baz"), "../"));
  expect(subpath).toBe(resolve(import.meta.dir, "node_modules/package-json-imports/foo/private-foo.js"));

  const react = import.meta.resolveSync(
    "#internal-react",
    join(import.meta.resolveSync("package-json-imports/baz"), "../"),
  );
  expect(react).toBe(resolve(import.meta.dir, "../../../../node_modules/react/index.js"));

  // Check that #foo is not resolved to the package.json file.
  try {
    import.meta.resolveSync("#foo");
    throw new Error("Test failed");
  } catch (exception) {
    expect(exception instanceof ResolveMessage).toBe(true);
    expect(exception.referrer).toBe(import.meta.path);
    expect(exception.name).toBe("ResolveMessage");
  }

  // Chcek that package-json-imports/#foo doesn't work
  try {
    import.meta.resolveSync("package-json-imports/#foo");
    throw new Error("Test failed");
  } catch (exception) {
    expect(exception instanceof ResolveMessage).toBe(true);
    expect(exception.referrer).toBe(import.meta.path);
    expect(exception.name).toBe("ResolveMessage");
  }
});

it("#imports with wildcard", async () => {
  const run = resolveFrom(resolve(import.meta.dir + "/node_modules/package-json-imports/package.json"));

  const wildcard = resolve(import.meta.dir + "/node_modules/package-json-imports/foo/wildcard.js");
  expect(run("#foo/wildcard.js")).toBe(wildcard);
  expect(run("#foo/extensionless/wildcard")).toBe(wildcard);
});

it("import.meta.resolveSync", async () => {
  expect(import.meta.resolveSync("./resolve-test.js")).toBe(import.meta.path);

  expect(import.meta.resolveSync("./resolve-test.js", import.meta.path)).toBe(import.meta.path);

  expect(
    // optional second param can be any path, including a dir
    import.meta.resolveSync("./resolve/resolve-test.js", join(import.meta.path, "../")),
  ).toBe(import.meta.path);

  // can be a package path
  expect(import.meta.resolveSync("react", import.meta.path).length > 0).toBe(true);

  // file extensions are optional
  expect(import.meta.resolveSync("./resolve-test")).toBe(import.meta.path);

  // works with tsconfig.json "paths"
  expect(import.meta.resolveSync("foo/bar")).toBe(join(import.meta.path, "../baz.js"));
  expect(import.meta.resolveSync("@faasjs/baz")).toBe(join(import.meta.path, "../baz.js"));
  expect(import.meta.resolveSync("@faasjs/bar")).toBe(join(import.meta.path, "../bar/src/index.js"));
  expect(import.meta.resolveSync("@faasjs/larger/bar")).toBe(join(import.meta.path, "../bar/larger-index.js"));

  // works with package.json "exports"
  expect(import.meta.resolveSync("package-json-exports/baz")).toBe(
    join(import.meta.path, "../node_modules/package-json-exports/foo/bar.js"),
  );

  // if they never exported /package.json, allow reading from it too
  expect(import.meta.resolveSync("package-json-exports/package.json")).toBe(
    join(import.meta.path, "../node_modules/package-json-exports/package.json"),
  );

  // if an unnecessary ".js" extension was added, try against /baz
  expect(import.meta.resolveSync("package-json-exports/baz.js")).toBe(
    join(import.meta.path, "../node_modules/package-json-exports/foo/bar.js"),
  );

  // works with TypeScript compiler edgecases like:
  // - If the file ends with .js and it doesn't exist, try again with .ts and .tsx
  expect(import.meta.resolveSync("./resolve-typescript-file.js")).toBe(
    join(import.meta.path, "../resolve-typescript-file.tsx"),
  );
  expect(import.meta.resolveSync("./resolve-typescript-file.tsx")).toBe(
    join(import.meta.path, "../resolve-typescript-file.tsx"),
  );

  // throws a ResolveMessage on failure
  try {
    import.meta.resolveSync("THIS FILE DOESNT EXIST");
    throw new Error("Test failed");
  } catch (exception) {
    expect(exception instanceof ResolveMessage).toBe(true);
    expect(exception.referrer).toBe(import.meta.path);
    expect(exception.name).toBe("ResolveMessage");
  }
});

// the slightly lower level API, which doesn't prefill the second param
// and expects a directory instead of a filepath
it("Bun.resolve", async () => {
  expect(await Bun.resolve("./resolve-test.js", import.meta.dir)).toBe(import.meta.path);
});

// synchronous
it("Bun.resolveSync", () => {
  expect(Bun.resolveSync("./resolve-test.js", import.meta.dir)).toBe(import.meta.path);
});

// error cases
it("Bun.resolve throws TypeError when called without arguments", async () => {
  try {
    await Bun.resolve();
    expect.unreachable("Should have thrown");
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toBe("Expected a specifier and a from path");
    expect(error.code).toBe("ERR_INVALID_ARG_TYPE");
  }
});

it("Bun.resolveSync throws TypeError when called without arguments", () => {
  try {
    Bun.resolveSync();
    expect.unreachable("Should have thrown");
  } catch (error) {
    expect(error).toBeInstanceOf(TypeError);
    expect(error.message).toBe("Expected a specifier and a from path");
    expect(error.code).toBe("ERR_INVALID_ARG_TYPE");
  }
});

it("dynamic import of file: URL with 4 slashes doesn't trigger ASAN", async () => {
  const error = await import(`file://` + `//a.js`).catch(e => e);
  // On Windows, this may throw a different error type due to path handling
  expect(error).toBeDefined();
  expect(error.toString()).toMatch(/Cannot find module|ModuleNotFound|ENOENT/);
});

it("require of file: URL with 4 slashes doesn't trigger ASAN", async () => {
  let err;
  try {
    import.meta.require(`file://` + `//a.js`);
  } catch (e) {
    err = e;
  }
  expect(err).not.toBeUndefined();
  expect(err).toBeObject();
});

it("self-referencing imports works", async () => {
  const baz = import.meta.resolveSync("package-json-exports/baz");
  const namespace = import.meta.resolveSync("package-json-exports/references-baz");
  Loader.registry.delete(baz);
  Loader.registry.delete(namespace);
  var a = await import(baz);
  var b = await import(namespace);
  expect(a.bar).toBe(1);
  expect(b.bar).toBe(1);

  Loader.registry.delete(baz);
  Loader.registry.delete(namespace);
  var a = await import("package-json-exports/baz");
  var b = await import("package-json-exports/references-baz");
  expect(a.bar).toBe(1);
  expect(b.bar).toBe(1);

  Loader.registry.delete(baz);
  Loader.registry.delete(namespace);
  var a = import.meta.require("package-json-exports/baz");
  var b = import.meta.require("package-json-exports/references-baz");
  expect(a.bar).toBe(1);
  expect(b.bar).toBe(1);

  Loader.registry.delete(baz);
  Loader.registry.delete(namespace);
  var a = import.meta.require(baz);
  var b = import.meta.require(namespace);
  expect(a.bar).toBe(1);
  expect(b.bar).toBe(1);

  // test that file:// works
  Loader.registry.delete(baz);
  Loader.registry.delete(namespace);
  var a = import.meta.require("file://" + baz);
  var b = import.meta.require("file://" + namespace);
  expect(a.bar).toBe(1);
  expect(b.bar).toBe(1);
});
