#include "InternalModuleRegistry.h"
#include "ZigGlobalObject.h"
#include <JavaScriptCore/BuiltinUtils.h>
#include <JavaScriptCore/JSFunction.h>
#include <JavaScriptCore/LazyProperty.h>
#include <JavaScriptCore/LazyPropertyInlines.h>
#include <JavaScriptCore/VMTrapsInlines.h>
#include <JavaScriptCore/JSModuleLoader.h>
#include <JavaScriptCore/Debugger.h>
#include <utility>

#include "InternalModuleRegistryConstants.h"
#include "wtf/Forward.h"

#include "NativeModuleImpl.h"
namespace Bun {

extern "C" bool BunTest__shouldGenerateCodeCoverage(BunString sourceURL);
extern "C" void ByteRangeMapping__generate(BunString sourceURL, BunString code, int sourceID);

static void maybeAddCodeCoverage(JSC::VM& vm, const JSC::SourceCode& code)
{
#if ASSERT_ENABLED
    bool isCodeCoverageEnabled = !!vm.controlFlowProfiler();
    bool shouldGenerateCodeCoverage = isCodeCoverageEnabled && BunTest__shouldGenerateCodeCoverage(Bun::toString(code.provider()->sourceURL()));
    if (shouldGenerateCodeCoverage) {
        ByteRangeMapping__generate(Bun::toString(code.provider()->sourceURL()), Bun::toString(code.provider()->source().toStringWithoutCopying()), code.provider()->asID());
    }
#endif
}

// The `INTERNAL_MODULE_REGISTRY_GENERATE` macro handles inlining code to compile and run a
// JS builtin that acts as a module. In debug mode, we use a different implementation that reads
// from the developer's filesystem. This allows reloading code without recompiling bindings.

JSC::JSValue generateModule(JSC::JSGlobalObject* globalObject, JSC::VM& vm, const String& SOURCE, const String& moduleName, const String& urlString)
{
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    auto&& origin = SourceOrigin(WTF::URL(urlString));
    SourceCode source = JSC::makeSource(SOURCE, origin,
        JSC::SourceTaintedOrigin::Untainted,
        moduleName);
    maybeAddCodeCoverage(vm, source);
    JSFunction* func
        = JSFunction::create(
            vm, globalObject,
            createBuiltinExecutable(
                vm, source,
                Identifier::fromString(vm, moduleName),
                ImplementationVisibility::Public,
                ConstructorKind::None,
                ConstructAbility::CannotConstruct,
                InlineAttribute::None)
                ->link(vm, nullptr, source),
            static_cast<JSC::JSGlobalObject*>(globalObject));

    RETURN_IF_EXCEPTION(throwScope, {});
    if (globalObject->hasDebugger() && globalObject->debugger()->isInteractivelyDebugging()) [[unlikely]] {
        globalObject->debugger()->sourceParsed(globalObject, source.provider(), -1, ""_s);
    }

    JSC::MarkedArgumentBuffer argList;
    JSValue result = JSC::profiledCall(
        globalObject,
        ProfilingReason::Other,
        func,
        JSC::getCallData(func),
        globalObject, JSC::MarkedArgumentBuffer());

    RETURN_IF_EXCEPTION(throwScope, {});
    ASSERT(
        result && result.isCell() && jsDynamicCast<JSObject*>(result),
        "Expected \"%s\" to export a JSObject. Bun is going to crash.",
        moduleName.utf8().span().data());
    return result;
}

ALWAYS_INLINE JSC::JSValue generateNativeModule(
    JSC::JSGlobalObject* globalObject,
    JSC::VM& vm,
    const SyntheticSourceProvider::SyntheticSourceGenerator& generator)
{
    Vector<JSC::Identifier, 4> propertyNames;
    JSC::MarkedArgumentBuffer arguments;
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    generator(
        globalObject,
        JSC::Identifier::EmptyIdentifier, // Our generators do not do anything with the key
        propertyNames,
        arguments);
    RETURN_IF_EXCEPTION(throwScope, {});
    // This goes off of the assumption that you only call this `evaluate` using a generator that explicitly
    // assigns the `default` export first.
    ASSERT_WITH_MESSAGE(
        propertyNames.at(0) == vm.propertyNames->defaultKeyword,
        "The native module must export a default value first.");
    JSValue defaultValue = arguments.at(0);
    ASSERT(defaultValue);
    return defaultValue;
}

#ifdef BUN_DYNAMIC_JS_LOAD_PATH
JSValue initializeInternalModuleFromDisk(
    JSGlobalObject* globalObject,
    VM& vm,
    const WTF::String& moduleName,
    WTF::String fileBase,
    const WTF::String& urlString)
{
    WTF::String file = makeString(ASCIILiteral::fromLiteralUnsafe(BUN_DYNAMIC_JS_LOAD_PATH), "/"_s, WTFMove(fileBase));
    if (auto contents = WTF::FileSystemImpl::readEntireFile(file)) {
        auto string = WTF::String::fromUTF8(contents.value());
        return generateModule(globalObject, vm, string, moduleName, urlString);
    } else {
        printf("\nFATAL: bun-debug failed to load bundled version of \"%s\" at \"%s\" (was it deleted?)\n"
               "Please re-compile Bun to continue.\n\n",
            moduleName.utf8().span().data(), file.utf8().span().data());
        CRASH();
    }
}
#define INTERNAL_MODULE_REGISTRY_GENERATE(globalObject, vm, moduleId, filename, SOURCE, urlString) \
    return initializeInternalModuleFromDisk(globalObject, vm, moduleId, filename, urlString)
#else

#define INTERNAL_MODULE_REGISTRY_GENERATE(globalObject, vm, moduleId, filename, SOURCE, urlString) \
    return generateModule(globalObject, vm, SOURCE, moduleId, urlString)
#endif

const ClassInfo InternalModuleRegistry::s_info = { "InternalModuleRegistry"_s, &Base::s_info, nullptr, nullptr, CREATE_METHOD_TABLE(InternalModuleRegistry) };

InternalModuleRegistry::InternalModuleRegistry(VM& vm, Structure* structure)
    : Base(vm, structure)
{
}

template<typename Visitor>
void InternalModuleRegistry::visitChildrenImpl(JSCell* cell, Visitor& visitor)
{
    auto* thisObject = jsCast<InternalModuleRegistry*>(cell);
    ASSERT_GC_OBJECT_INHERITS(thisObject, info());
    Base::visitChildren(thisObject, visitor);
}

DEFINE_VISIT_CHILDREN_WITH_MODIFIER(JS_EXPORT_PRIVATE, InternalModuleRegistry);

InternalModuleRegistry* InternalModuleRegistry::create(VM& vm, Structure* structure)
{
    InternalModuleRegistry* registry = new (NotNull, allocateCell<InternalModuleRegistry>(vm)) InternalModuleRegistry(vm, structure);
    registry->finishCreation(vm);
    return registry;
}

void InternalModuleRegistry::finishCreation(VM& vm)
{
    Base::finishCreation(vm);
    ASSERT(inherits(info()));

    for (uint8_t i = 0; i < BUN_INTERNAL_MODULE_COUNT; i++) {
        this->internalField(static_cast<Field>(i)).set(vm, this, jsUndefined());
    }
}

Structure* InternalModuleRegistry::createStructure(VM& vm, JSGlobalObject* globalObject)
{
    return Structure::create(vm, globalObject, jsNull(), TypeInfo(InternalFieldTupleType, StructureFlags), info(), 0, 0);
}

JSValue InternalModuleRegistry::requireId(JSGlobalObject* globalObject, VM& vm, Field id)
{
    auto throwScope = DECLARE_THROW_SCOPE(vm);

    auto value = internalField(id).get();
    if (!value || value.isUndefined()) {
        value = createInternalModuleById(globalObject, vm, id);
        RETURN_IF_EXCEPTION(throwScope, {});
        internalField(id).set(vm, this, value);
    }
    return value;
}

#include "InternalModuleRegistry+createInternalModuleById.h"

// This is called like @getInternalField(@internalModuleRegistry, 1) ?? @createInternalModuleById(1)
// so we want to write it to the internal field when loaded.
JSC_DEFINE_HOST_FUNCTION(InternalModuleRegistry::jsCreateInternalModuleById, (JSGlobalObject * lexicalGlobalObject, CallFrame* callframe))
{
    auto& vm = JSC::getVM(lexicalGlobalObject);
    auto throwScope = DECLARE_THROW_SCOPE(vm);
    auto id = callframe->argument(0).toUInt32(lexicalGlobalObject);

    auto registry = jsCast<Zig::GlobalObject*>(lexicalGlobalObject)->internalModuleRegistry();
    auto mod = registry->createInternalModuleById(lexicalGlobalObject, vm, static_cast<Field>(id));
    RETURN_IF_EXCEPTION(throwScope, {});
    registry->internalField(static_cast<Field>(id)).set(vm, registry, mod);
    return JSValue::encode(mod);
}

} // namespace Bun

#undef INTERNAL_MODULE_REGISTRY_GENERATE
