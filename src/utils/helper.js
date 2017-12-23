var $_GET = (function(){
    var url = window.document.location.href.toString();
    var u = url.split("?");
    if(typeof(u[1]) == "string"){
        u = u[1].split("&");
        var get = {};
        for(var i in u){
            if(typeof(u[i])=="function")continue;
            var j = u[i].split("=");
            get[j[0]] = j[1];
        }
        return get;
    } else {
        return {};
    }
})();

// https://stackoverflow.com/questions/3442394
$.fn.pureText = function() {
    var text =
        this.clone()    //clone the element
            .children() //select all the children
            .remove()   //remove all the children
            .end()  //again go back to selected element
            .text();
    return text;
}

$.endInt = function(str) {
    return parseInt(str.match(/\d+$/)[0]);
}

$.diffByKey = function(arr1, arr2, key) {
    var arr2Key = arr2.map(item => item[key]);
    return arr1.filter(item => arr2Key.indexOf(item[key]) < 0);
}

var StorageHelper = (function(){
    var getKey = (type, id, prefix) => (prefix||'cur') + '-' + type + '-' + (id||0);
    return {
        save(type, id, data, prefix) {
            // log("StorageSave", type, id, prefix, data);
            localStorage[getKey(type, id, prefix)] = JSON.stringify(data);
        },
        get(type, id, prefix) {
            try {
                return JSON.parse(localStorage[getKey(type, id, prefix)]);
            } catch(e) {
                return [];
            }
        }
    }
})();

window.isAtRootPage = function() {
    var path = location.pathname;
    return path == '' || path == '/' || path.startsWith('/index.php');
}

window.showGrp = function(grp) {
    $(".grp").hide();
    $(".grp-" + grp).show();
}

window.log = function() {
    var prefix = location.pathname + location.search;
    console.log('['+prefix+']', ...arguments);
}

window.inIframe = function() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
}

// https://stackoverflow.com/questions/1584370
Array.prototype.unique = function() {
    var a = this.concat();
    for(var i=0; i<a.length; ++i) {
        for(var j=i+1; j<a.length; ++j) {
            if(a[i] === a[j])
                a.splice(j--, 1);
        }
    }

    return a;
};

window.getURL = function(src) {
    if(typeof(chrome)!=='undefined') {
        return chrome.extension.getURL('/'+src);
    } else if(typeof(safari)!=='undefined') {
        return safari.extension.baseURI + src;
    } else {
        throw new Exception('No available env');
    }
}

window.bootByUrl = function(urlMatch, callback) {
    $(() => {
        if(location.host.indexOf(urlMatch) != -1) {
            callback();
        }
    });
}

$.fn.extend({
    advancedClick() {
        var $el = $(this);
        if($el.attr('href')) {
            location.href = $el.attr('href');
        } else {
            $el.click();
        }
    }
});

// https://stackoverflow.com/questions/5202296/add-a-hook-to-all-ajax-requests-on-a-page
window.addXMLRequestCallback = function(callback){
    var oldSend, i;
    if( XMLHttpRequest.callbacks ) {
        // we've already overridden send() so just add the callback
        XMLHttpRequest.callbacks.push( callback );
    } else {
        // create a callback queue
        XMLHttpRequest.callbacks = [callback];
        // store the native send()
        oldSend = XMLHttpRequest.prototype.send;
        // override the native send()
        XMLHttpRequest.prototype.send = function(){
            // process the callback queue
            // the xhr instance is passed into each callback but seems pretty useless
            // you can't tell what its destination is or call abort() without an error
            // so only really good for logging that a request has happened
            // I could be wrong, I hope so...
            // EDIT: I suppose you could override the onreadystatechange handler though
            for( i = 0; i < XMLHttpRequest.callbacks.length; i++ ) {
                XMLHttpRequest.callbacks[i]( this );
            }
            // call the native send()
            oldSend.apply(this, arguments);
        }
    }
}

// https://stackoverflow.com/questions/3219758/detect-changes-in-the-dom
var observeDOM = (function(){
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
        eventListenerSupported = window.addEventListener;

    return function(obj, callback){
        // define a new observer
        var obs = new MutationObserver(function(mutations, observer){
            if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                callback(mutations);
        });
        // have the observer observe foo for changes in children
        obs.observe( obj, { childList:true, subtree:true });
    };
})();

window.throttle = function(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function () {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };
    return function () {
        var now = Date.now();
        if (!previous && options.leading === false) previous = now;
        var remaining = wait - (now - previous);
        context = this;
        args = arguments;
        if (remaining <= 0 || remaining > wait) {
            if (timeout) {
                clearTimeout(timeout);
                timeout = null;
            }
            previous = now;
            result = func.apply(context, args);
            if (!timeout) context = args = null;
        } else if (!timeout && options.trailing !== false) {
            timeout = setTimeout(later, remaining);
        }
        return result;
    };
};

console.realLog = console.log;
console.log = function() {
    var prefix = (isMainFrameMode()?'M':'A');
    console.realLog('['+prefix+']', ...arguments);
}