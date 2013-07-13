// Support a short-hand syntax of "key.subkey: value". The "key.subkey" binding
// handler will be created as needed but can also be created manually using
// ko.getBindingHandler.
var keySubkeyMatch = /([^\.]+)\.(.+)/, keySubkeyBindingDivider = '.';
function makeKeySubkeyBindingHandler(bindingKey) {
    var match = bindingKey.match(keySubkeyMatch);
    if (match) {
        var baseKey = match[1],
            baseHandler = ko.bindingHandlers[baseKey];
        if (baseHandler) {
            var subKey = match[2],
                makeSubHandlerFn = baseHandler.makeSubkeyHandler || makeDefaultKeySubkeyHandler,
                subHandler = makeSubHandlerFn.call(baseHandler, baseKey, subKey, bindingKey);
            ko.bindingHandlers[bindingKey] = subHandler;
            return subHandler;
        }
    }
}

// Create a binding handler that translates a binding of "bindingKey: value" to
// "basekey: {subkey: value}". Compatible with these default bindings: event, attr, css, style.
function makeDefaultKeySubkeyHandler(baseKey, subKey, bindingKey) {
    var subHandler = ko.utils.extend({}, this);
    function setHandlerFunction(funcName) {
        if (subHandler[funcName]) {
            subHandler[funcName] = function(element, valueAccessor) {
                function subValueAccessor() {
                    var result = {};
                    result[subKey] = valueAccessor();
                    return result;
                }
                var args = Array.prototype.slice.call(arguments, 0);
                args[1] = subValueAccessor;
                return ko.bindingHandlers[baseKey][funcName].apply(this, args);
            };
        }
    }
    // Set new init and update functions that wrap the originals
    setHandlerFunction('init');
    setHandlerFunction('update');
    // Clear any preprocess function since preprocessing of the new binding would need to be different
    if (subHandler.preprocess)
        subHandler.preprocess = null;
    if (ko.virtualElements.allowedBindings[baseKey])
        ko.virtualElements.allowedBindings[bindingKey] = true;
    return subHandler;
}

// You can use ko.getBindingHandler to manually create key.subkey bindings
var oldGetHandler = ko.getBindingHandler;
ko.getBindingHandler = function(bindingKey) {
    return oldGetHandler(bindingKey) || makeKeySubkeyBindingHandler(bindingKey);
};

function autoKeySubkeyPreprocess(value, key, addBinding) {
    if (value.charAt(0) !== "{")
        return value;

    // Handle two-level binding specified as "binding: {key: value}" by parsing inner
    // object and converting to "binding.key: value"
    var subBindings = ko.expressionRewriting.parseObjectLiteral(value);
    ko.utils.arrayForEach(subBindings, function(keyValue) {
        addBinding(key+'.'+keyValue.key, keyValue.value);
    });
}

// Set the key.subkey preprocessor for a specific binding
function enableAutoKeySubkeySyntax(bindingKey) {
    setBindingPreprocessFunction(bindingKey, autoKeySubkeyPreprocess);
}

// Export the preprocessor functions
ko.punches.keySubkey = {
    makeDefaultHandler: makeDefaultKeySubkeyHandler,
    preprocessor: autoKeySubkeyPreprocess,
    enableForBinding: enableAutoKeySubkeySyntax
};