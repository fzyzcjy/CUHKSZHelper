// utils.getURL
window.getURL = function(src) {
    if(typeof(chrome)!=='undefined') {
        return chrome.extension.getURL('/'+src);
    } else if(typeof(safari)!=='undefined') {
        return safari.extension.baseURI + src;
    } else {
        throw new Exception('No available env');
    }
}
window.inIframe = function() {
    try {
        return window.self !== window.top;
    } catch (e) {
        return true;
    }
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
function throttle(func, wait, options) {
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

var IFRAME_SELECTOR = "iframe#ptifrmtgtframe";
var floatHtmlTemplate = '';

var hotKeyDataArr = [];
var taskSeqDataMap = {};

var globalCnt = 0;
var activeHotKeyHandler = {};
function createHotKey(data) {
    var status = true;

    if(typeof(data.onTrigger) == 'string' && data.onTrigger == 'click') {
        data.onTrigger = () => {
            var $el = $(data.bindSelector);
            $el.advancedClick();
        };
    }

    var $parent = $(data.bindSelector || 'body');

    if(data.isActive && !data.isActive()) {
        status = 'Not active';
    } else if($parent.length == 0) {
        status = "Ele not found";
    } else if (!isFrameSuitable(data.frame)) {
        status = "Mode not suitable";
    }

    if(status !== true) {
        // console.log('LoadHotKey', data.name, '- ' + status);
        return;
    } else {
        // console.log('LoadHotKey', data.name, "- OK");
    }

    if(data.mode == 'raw') {
        data.render();
    } else {
        var bodyRect = document.body.getBoundingClientRect();
        var parentPosRect = $parent[0].getBoundingClientRect();
        var $html = $(tmpl(floatHtmlTemplate, data));

        switch(data.mode) {
        case 'highlight':
            $parent.addClass('highlight');
            $html.css({
                'left': parentPosRect.left - bodyRect.left,
                'top': parentPosRect.top - bodyRect.top + parentPosRect.height + 3
            });
            break;
        case 'global':
            $html.css({
                'left': 16,
                'top': globalCnt * 40 + 16,
                'position': 'fixed',
            });
            globalCnt++;
            break;
        }

        $html.click(data.onTrigger);
        $("body").append($html);

        if(data.hotKey) {
            Mousetrap.bind(data.hotKey, data.onTrigger);
        }

        activeHotKeyHandler[data.hotKey] = data.onTrigger;
    }
}

function createAllHotKey() {
    for(var i = 0; i < hotKeyDataArr.length; ++i) {
        createHotKey(hotKeyDataArr[i]);
    }
}

window.onmessage = function(e) {
    switch(e.data.action) {
    case 'HotKey':
        var hotKey = e.data.hotKey;
        var handler = activeHotKeyHandler[hotKey];
        if(handler) handler();
        break;
    }
};

function registerHotKeyPassToIframe() {
    var uniqueHotKeyArr =hotKeyDataArr.map(data => data.hotKey).filter((v, i, a) => a.indexOf(v) === i);
    for(var i = 0; i<uniqueHotKeyArr.length; ++i) {
        var hotKey = uniqueHotKeyArr[i];
        if(!hotKey) continue;
        Mousetrap.bind(hotKey, (function() {
            var hk = hotKey;
            return () => {
                $(IFRAME_SELECTOR)[0].contentWindow.postMessage({
                    action: 'HotKey',
                    hotKey: hk,
                }, '*');
            };
        })() );
    }
}

function isMainFrameMode() {
    return $(IFRAME_SELECTOR).length == 0 || inIframe();
}

function isFrameSuitable(needFrame) {
    var isMain = isMainFrameMode();
    switch(needFrame || 'main') {
    case 'main': return isMain;
    case 'assistant': return !isMain;
    case 'all': return true;
    default: throw new Exception('');
    }
}

var onPageChange = throttle(function(){
    console.log("Page changed");
    reboot();
}, 500);

function registerEvents() {
    // document.body.addEventListener('click', function() {
    //     console.log(event.target);
    //     if(!$(event.target).hasClass('injected-dom')) {
    //         onPageChange();
    //     }
    // }, true);
    // addXMLRequestCallback(onPageChange);
    observeDOM($("body")[0], function(mutation){ 
        // console.log(mutation);
        var injectedBySelf = true;
        for(var i = 0;i<mutation.length; ++i) {
            var addedNodes = Array.from(mutation[i].addedNodes);
            injectedBySelf =
                addedNodes.length == 0 ||
                addedNodes.every(node => $(node).hasClass('injected-dom'));
            if(!injectedBySelf) {
                break;
            }
        }
        if(!injectedBySelf) {
            onPageChange();
        }
    });
}

function changeFocus() {
    setTimeout(() => {
        $("body").focus();
    }, 0);
}

function boot() {
    $.get(getURL('float.template.html'), function(data) {
        console.log("Boot");
        floatHtmlTemplate = data;
        createAllHotKey();
        if(isMainFrameMode()) {
            console.log("Main frame mode");
            changeFocus();
            autoContinueSequence();

            registerEvents();
            $.get(getURL('inject.template.html'), function(data) {
                $("body").append(data);
                $(".refresh-page").click(() => {
                    location.reload();
                });
            });

        } else {
            console.log("Assistant frame mode");
            registerHotKeyPassToIframe();
        }
    });
}

function reboot() {
    console.log("Reboot");
    // clear var
    globalCnt = 0;
    activeHotKeyHandler = {};
    // clear html
    $('.injected-dom:not(.preserve)').remove();
    $('.highlight').removeClass('highlight');

    Mousetrap.reset();
    createAllHotKey();
    if(isMainFrameMode()) {
        changeFocus();
        autoContinueSequence();
    } else {
        registerHotKeyPassToIframe();
    }
}

$(boot);

// sequence

var KEY_SEQ_NAME = 'SeqName';
var KEY_SEQ_STAGE = 'SeqStage';

function startSequence(seqName) {
    localStorage[KEY_SEQ_NAME] = seqName;
    localStorage[KEY_SEQ_STAGE] = '0';
    autoContinueSequence();
}

function autoContinueSequence() {
    var seqName = localStorage[KEY_SEQ_NAME];
    var seqStage = parseInt(localStorage[KEY_SEQ_STAGE]);
    if(!seqName) {
        return;
    }
    
    var taskSeq = taskSeqDataMap[seqName];
    var taskData = taskSeq[seqStage];

    if(!isFrameSuitable(taskData.frame)) {
        return;
    }

    console.log('RunningSeq', seqName, seqStage);

    nextStage = seqStage + 1;
    if(nextStage >= taskSeq.length) {
        localStorage.removeItem(KEY_SEQ_NAME);
    } else {
        localStorage[KEY_SEQ_STAGE] = '' + nextStage;
    }

    showCenteredHint('Executing task: ' + seqName);

    taskData.execute();
}

function showCenteredHint(text) {
    var $html = $(tmpl(floatHtmlTemplate, {
        text: text
    }));
    $html.addClass('center-up');
    $("body").append($html);
}

// data

var HIGHLIGHT_TEMPLATE = {
    text: '',
    hotKey: 'f2',
    mode: 'highlight',
    onTrigger: 'click',
};

hotKeyDataArr.push({
    name: "EnglishVersion",
    text: 'Eng Version',
    hotKey: 'f4',
    mode: 'global',
    isActive() {
        return $("#ptLabelUserid label").length > 0 && $("#ptLabelUserid label").text() != 'User ID';
    },
    onTrigger() {
        location.href = 'http://116.31.95.2:81/psp/csprd/EMPLOYEE/HRMS/?&cmd=login&languageCd=ENG';
    },
});
// hotKeyDataArr.push({
//     name: 'OptimizedMode',
//     text: 'Go into Optimized Mode',
//     hotKey: 'f4',
//     mode: 'global',
//     isActive() {
//         return $("iframe#ptifrmtgtframe").length > 0
//             || location.href.indexOf('STUDENT_HOMEPAGE') != -1;
//     },
//     onTrigger() {
//         var go = '';
//         if($("iframe#ptifrmtgtframe").length > 0) {
//             go = $("iframe#ptifrmtgtframe")[0].contentDocument.location.href;
//         } else {
//             go = 'http://116.31.95.2:81/psc/csprd/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL?FolderPath=PORTAL_ROOT_OBJECT.CO_EMPLOYEE_SELF_SERVICE.HCCC_ENROLLMENT.HC_SSR_SSENRL_CART_GBL&IsFolder=false&IgnoreParamTempl=FolderPath%2cIsFolder';
//         }
//         location.href = go;
//     }
// });
hotKeyDataArr.push(Object.assign({}, HIGHLIGHT_TEMPLATE, {
    name: 'Login',
    bindSelector: '.ps_signinentry input[type=submit]'
}));
hotKeyDataArr.push(Object.assign({}, HIGHLIGHT_TEMPLATE, {
    name: 'StartSearch',
    bindSelector: '#DERIVED_REGFRM1_SSR_PB_SRCH',
    onTrigger() {
        $('#DERIVED_REGFRM1_SSR_PB_SRCH').advancedClick();
        // var iId = setInterval(() => {
        //     if($('.PSGROUPBOXLABEL').text() == "Search for Classes") {
        //         clearInterval(iId);
        //         reboot();
        //     }
        // }, 500);
    }
}));
// hotKeyDataArr.push(Object.assign({}, HIGHLIGHT_TEMPLATE, {
//     name: 'SearchStep2',
//     bindSelector: '#CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH'
// }));
hotKeyDataArr.push({
    name: 'SearchStep2',
    mode: 'raw',
    isActive() {
        return $('#CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH').length > 0;
    },
    render() {
        $.get(getURL('search_subject.template.html'), function(template) {
            var data = {
                subjectArr: 
                    $.map($("#SSR_CLSRCH_WRK_SUBJECT\\$0 option"), op => op.value)
                        .filter(x => x)
            };
            var $html = $(tmpl(template, data));
            $("body #win0divDERIVED_CLSRCH_GROUP2").parent().prepend($html);
            $html.on('click', '.subject', function() {
                var $this = $(this);
                var subject = $this.data('subject');
                $("#SSR_CLSRCH_WRK_SUBJECT\\$0")[0].value = subject;
                setTimeout(() => {
                    $("#CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH").advancedClick();
                }, 0);
            });
        });
    }
});
//TODO: this is auto executed...
hotKeyDataArr.push((function() {
    var getElArr = () => 
        $("a[id*=viewall]")
            .filter((idx,el) => $(el).text() == "View All Sections");
    return {
        name: "ViewAllSection",
        mode: 'raw',
        isActive() {
            return getElArr().length > 0;
        },
        render() {
            if(getElArr().length>0) {
                // hint
                showCenteredHint('Viewing all sections...');
                // click
                $(getElArr()[0]).advancedClick();
            }
        },
    };
})());
hotKeyDataArr.push(Object.assign({}, HIGHLIGHT_TEMPLATE, {
    name: 'GoBackToSearchResults',
    bindSelector: '#CLASS_SRCH_WRK2_SSR_PB_BACK'
}));
hotKeyDataArr.push({
    name: "GoToSearchCourse",
    text: 'Go to Search Course',
    frame: 'assistant',
    mode: 'global',
    isActive() {
        return true; //TODO:
    },
    onTrigger() {
        startSequence('GoToSearchCourse');
    },
});
taskSeqDataMap['GoToSearchCourse'] = [
    {
        frame: 'assistant',
        execute() {
            location.href = 'http://116.31.95.2:81/psp/csprd/EMPLOYEE/HRMS/s/WEBLIB_PTPP_SC.HOMEPAGE.FieldFormula.IScript_AppHP?pt_fname=HCCC_ENROLLMENT&FolderPath=PORTAL_ROOT_OBJECT.CO_EMPLOYEE_SELF_SERVICE.HCCC_ENROLLMENT&IsFolder=true';
        },
    },
    {
        frame: 'main',
        execute() {
            location.href = 'http://116.31.95.2:81/psc/csprd/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.CLASS_SEARCH.GBL?Page=SSR_CLSRCH_ENTRY';
        },
    },
];