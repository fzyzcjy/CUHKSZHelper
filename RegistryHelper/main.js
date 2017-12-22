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
var settingDataArr = [];

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

    if (!isFrameSuitable(data.frame)) {
        status = "Mode not suitable";
    } else if(data.isActive && !data.isActive()) {
        status = 'Not active';
    } else if($parent.length == 0) {
        status = "Ele not found";
    }

    if(status !== true) {
        // console.log('LoadHotKey', data.name, '- ' + status);
        return;
    } else {
        // console.log('LoadHotKey', data.name, "- OK");
    }

    if(data.autoSetting && readSetting(data.autoSetting) == true) {
        console.log(data.name, 'Auto Trigger by Setting');
        data.onTrigger('auto');
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
    var isFrame = inIframe();
    switch(needFrame || 'main') {
    case 'main': return isMain;
    case 'assistant': return !isMain;
    case 'all': return true;
    case 'not_iframe': return !inIframe();
    case 'iframe': return inIframe();
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

function injectPersistentDOM() {
    $.get(getURL('inject.template.html'), function(data) {
        $("body").append(data);
        $(".refresh-page").click(() => {
            location.reload();
        });
        $(".open-setting").click(() => {
            openSetting();
        });
    });
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
            injectPersistentDOM();

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

function startSequence(seqName, forceStart) {
    if(!forceStart && localStorage[KEY_SEQ_NAME]) {
        return;
    }
    localStorage[KEY_SEQ_NAME] = seqName;
    localStorage[KEY_SEQ_STAGE] = '0';
    console.log("Start Sequence", seqName);
    autoContinueSequence();
}

function stopSequence() {
    localStorage.removeItem(KEY_SEQ_NAME);
    reboot();
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
        stopSequence();
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

// setting

var KEY_SETTING = 'MainSetting';

function openSetting() {
    var settings = QuickSettings.create(0, 0, "Settings", document.body);
    for(var i = 0;i<settingDataArr.length; ++i) {
        var d = settingDataArr[i];
        switch(d.type) {
        case 'checkbox':
            settings.addBoolean(d.text, d.defValue, ()=>{});
            break;
        default:
            throw new Exception();
        }
    }
    var width = 384;
    var left = ($(document).width() - width) / 2;
    settings.setWidth(width);
    settings.setPosition(left, 96);
    settings.addButton('Close', () => {
        settings.destroy();
        reboot();
    });
    settings.saveInLocalStorage(KEY_SETTING);
}

function readSetting(name) {
    var setting = settingDataArr.find(setting => setting.name == name);
    var key = setting.text;
    var data = localStorage[KEY_SETTING] || '{}';
    var ans = JSON.parse(data)[key];
    return (ans===undefined) ? setting.defValue : ans;
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
    autoSetting: 'AutoEngVersion',
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
var SELECTOR_SEARCH_COURSE_PAGE = '#CLASS_SRCH_WRK2_SSR_PB_CLASS_SRCH'
hotKeyDataArr.push({
    name: 'SearchStep2',
    mode: 'raw',
    isActive() {
        return $(SELECTOR_SEARCH_COURSE_PAGE).length > 0;
    },
    render() {
        $.get(getURL('search_subject.template.html'), function(template) {
            var data = {
                subjectArr: 
                    $.map($("#SSR_CLSRCH_WRK_SUBJECT\\$0 option"), (op) => {
                        return {
                            abbr: op.value,
                            hint: $(op).text(),
                        };
                    })
                    .filter(item => item.abbr),
            };
            // console.log(data);
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
var getViewAllElArr = () =>
        $("a[id*=viewall]")
            .filter((idx,el) => $(el).text() == "View All Sections");
hotKeyDataArr.push((function() {
    return {
        name: "ViewAllSection",
        text: 'View All',
        mode: 'global',
        autoSetting: 'AutoExpandCourse',
        isActive() {
            return getViewAllElArr().length > 0;
        },
        onTrigger() {
            startSequence('ViewAllSection');
        },
    };
})());
taskSeqDataMap['ViewAllSection'] = (() => {
    // trick: although we do not know how many times it will need, we can still do the while-true-and-break trick
    var func = () => {
        if(getViewAllElArr().length>0) {
            $(getViewAllElArr()[0]).advancedClick();
        } else {
            stopSequence();
        }
    }
    var result = [];
    var N = 10;
    for(var i = 0;i<N;++i) {
        result.push({
            frame: 'iframe',
            execute: func,
        });
    }
    return result;
})();

hotKeyDataArr.push(Object.assign({}, HIGHLIGHT_TEMPLATE, {
    name: 'GoBackToSearchResults',
    bindSelector: '#CLASS_SRCH_WRK2_SSR_PB_BACK'
}));
var SEARCH_COURSE_URL = 'http://116.31.95.2:81/psc/csprd/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.CLASS_SEARCH.GBL?Page=SSR_CLSRCH_ENTRY';
hotKeyDataArr.push({
    name: "GoToSearchCourse",
    text: 'Go to Search Course',
    frame: 'not_iframe',
    mode: 'global',
    autoSetting: 'AutoGoSearchPage',
    isActive() {
        var iframe = $(IFRAME_SELECTOR)[0];
        // console.log(iframe.contentWindow.document);
        return !iframe || ($(iframe.contentWindow.document).find(SELECTOR_SEARCH_COURSE_PAGE).length == 0)
    },
    onTrigger(mode) {
        if(mode!='auto' || location.href.indexOf('STUDENT_HOMEPAGE')!=-1) {
            // console.log(mode, location.href);
            startSequence('GoToSearchCourse', true);
        }
    },
});
taskSeqDataMap['GoToSearchCourse'] = [
    {
        frame: 'not_iframe',
        execute() {
            location.href = 'http://116.31.95.2:81/psp/csprd/EMPLOYEE/HRMS/s/WEBLIB_PTPP_SC.HOMEPAGE.FieldFormula.IScript_AppHP?pt_fname=HCCC_ENROLLMENT&FolderPath=PORTAL_ROOT_OBJECT.CO_EMPLOYEE_SELF_SERVICE.HCCC_ENROLLMENT&IsFolder=true';
        },
    },
    {
        frame: 'iframe',
        execute() {
            location.href = SEARCH_COURSE_URL;
        },
    },
];

settingDataArr.push({
    name: 'AutoEngVersion',
    text: 'Switch to English version automatically',
    type: 'checkbox',
    defValue: true,
});
settingDataArr.push({
    name: 'AutoGoSearchPage',
    text: 'Go to course searching page after signing in',
    type: 'checkbox',
    defValue: true,
});
settingDataArr.push({
    name: 'AutoExpandCourse',
    text: 'Expand all courses automatically',
    type: 'checkbox',
    defValue: true,
});