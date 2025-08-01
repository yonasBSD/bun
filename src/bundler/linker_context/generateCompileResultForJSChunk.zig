pub fn generateCompileResultForJSChunk(task: *ThreadPoolLib.Task) void {
    const part_range: *const PendingPartRange = @fieldParentPtr("task", task);
    const ctx = part_range.ctx;
    var worker = ThreadPool.Worker.get(@fieldParentPtr("linker", ctx.c));
    defer worker.unget();

    const prev_action = if (Environment.show_crash_trace) bun.crash_handler.current_action;
    defer if (Environment.show_crash_trace) {
        bun.crash_handler.current_action = prev_action;
    };
    if (Environment.show_crash_trace) bun.crash_handler.current_action = .{ .bundle_generate_chunk = .{
        .chunk = ctx.chunk,
        .context = ctx.c,
        .part_range = &part_range.part_range,
    } };

    if (Environment.show_crash_trace) {
        const path = ctx.c.parse_graph.input_files.items(.source)[part_range.part_range.source_index.get()].path;
        if (bun.cli.debug_flags.hasPrintBreakpoint(path)) {
            @breakpoint();
        }
    }

    ctx.chunk.compile_results_for_chunk[part_range.i] = generateCompileResultForJSChunkImpl(worker, ctx.c, ctx.chunk, part_range.part_range);
}

fn generateCompileResultForJSChunkImpl(worker: *ThreadPool.Worker, c: *LinkerContext, chunk: *Chunk, part_range: PartRange) CompileResult {
    const trace = bun.perf.trace("Bundler.generateCodeForFileInChunkJS");
    defer trace.end();

    // Client bundles for Bake must be globally allocated,
    // as it must outlive the bundle task.
    const allocator = if (c.dev_server) |dev|
        if (c.parse_graph.ast.items(.target)[part_range.source_index.get()].bakeGraph() == .client)
            dev.allocator
        else
            default_allocator
    else
        default_allocator;

    var arena = &worker.temporary_arena;
    var buffer_writer = js_printer.BufferWriter.init(allocator);
    defer _ = arena.reset(.retain_capacity);
    worker.stmt_list.reset();

    var runtime_scope: *Scope = &c.graph.ast.items(.module_scope)[c.graph.files.items(.input_file)[Index.runtime.value].get()];
    var runtime_members = &runtime_scope.members;
    const toCommonJSRef = c.graph.symbols.follow(runtime_members.get("__toCommonJS").?.ref);
    const toESMRef = c.graph.symbols.follow(runtime_members.get("__toESM").?.ref);
    const runtimeRequireRef = if (c.options.output_format == .cjs) null else c.graph.symbols.follow(runtime_members.get("__require").?.ref);

    const result = c.generateCodeForFileInChunkJS(
        &buffer_writer,
        chunk.renamer,
        chunk,
        part_range,
        toCommonJSRef,
        toESMRef,
        runtimeRequireRef,
        &worker.stmt_list,
        worker.allocator,
        arena.allocator(),
    );

    return .{
        .javascript = .{
            .source_index = part_range.source_index.get(),
            .result = result,
        },
    };
}

pub const DeferredBatchTask = bun.bundle_v2.DeferredBatchTask;
pub const ParseTask = bun.bundle_v2.ParseTask;

const bun = @import("bun");
const Environment = bun.Environment;
const ThreadPoolLib = bun.ThreadPool;
const default_allocator = bun.default_allocator;
const js_printer = bun.js_printer;
const renamer = bun.renamer;

const js_ast = bun.ast;
const Scope = js_ast.Scope;

const bundler = bun.bundle_v2;
const Chunk = bundler.Chunk;
const CompileResult = bundler.CompileResult;
const Index = bun.bundle_v2.Index;
const PartRange = bundler.PartRange;
const ThreadPool = bun.bundle_v2.ThreadPool;

const LinkerContext = bun.bundle_v2.LinkerContext;
const PendingPartRange = LinkerContext.PendingPartRange;
