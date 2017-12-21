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

var floatHtmlTemplate = '';

var globalCnt = 0;
var activeHotKeyHandler = {};
function createHotKey(data) {
    if(typeof(data.onTrigger) == 'string' && data.onTrigger == 'click') {
        data.onTrigger = () => {
            var $el = $(data.bindSelector);
            $el.advancedClick();
        };
    }

    if(data.isActive && !data.isActive()) {
        console.log(data.name, "Not Active");
        return;
    }

    var $parent = $(data.bindSelector || 'body');
    if($parent.length == 0) {
        console.log(data.name, "Ele not found");
        return;
    }

    console.log(data.name, "OK");

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
            });
            globalCnt++;
            break;
        }

        $html.click(data.onTrigger);
        $("body").append($html);

        Mousetrap.bind(data.hotKey, data.onTrigger);

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

function registerHotKeyPassFromIframe() {
    var uniqueHotKeyArr =hotKeyDataArr.map(data => data.hotKey).filter((v, i, a) => a.indexOf(v) === i);
    for(var i = 0; i<uniqueHotKeyArr.length; ++i) {
        var hotKey = uniqueHotKeyArr[i];
        Mousetrap.bind(hotKey, () => {
            window.top.postMessage({
                action: 'HotKey',
                hotKey: hotKey,
            }, '*');
        });
    }
}

var HIGHLIGHT_TEMPLATE = {
    text: '',
    hotKey: 'f2',
    mode: 'highlight',
    onTrigger: 'click',
};

var hotKeyDataArr = [];
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
hotKeyDataArr.push({
    name: 'OptimizedMode',
    text: 'Go into Optimized Mode',
    hotKey: 'f4',
    mode: 'global',
    isActive() {
        return $("iframe#ptifrmtgtframe").length > 0
            || location.href.indexOf('STUDENT_HOMEPAGE') != -1;
    },
    onTrigger() {
        var go = '';
        if($("iframe#ptifrmtgtframe").length > 0) {
            go = $("iframe#ptifrmtgtframe")[0].contentDocument.location.href;
        } else {
            go = 'http://116.31.95.2:81/psc/csprd/EMPLOYEE/HRMS/c/SA_LEARNER_SERVICES.SSR_SSENRL_CART.GBL?FolderPath=PORTAL_ROOT_OBJECT.CO_EMPLOYEE_SELF_SERVICE.HCCC_ENROLLMENT.HC_SSR_SSENRL_CART_GBL&IsFolder=false&IgnoreParamTempl=FolderPath%2cIsFolder';
        }
        location.href = go;
    }
});
hotKeyDataArr.push(Object.assign({}, HIGHLIGHT_TEMPLATE, {
    name: 'Login',
    bindSelector: '.ps_signinentry input[type=submit]'
}));
hotKeyDataArr.push(Object.assign({}, HIGHLIGHT_TEMPLATE, {
    name: 'StartSearch',
    bindSelector: '#DERIVED_REGFRM1_SSR_PB_SRCH',
    onTrigger() {
        $('#DERIVED_REGFRM1_SSR_PB_SRCH').advancedClick();
        var iId = setInterval(() => {
            if($('.PSGROUPBOXLABEL').text() == "Search for Classes") {
                clearInterval(iId);
                reboot();
            }
        }, 500);
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
            console.log($("#SSR_CLSRCH_WRK_SUBJECT\\$0 option"), data);
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
})
//TODO $("a[id*=viewall]").advancedClick()

function registerEvents() {
    $("body").click(() => {
        $("body").addClass('hide-focus-hint');
    })
}

function boot() {

    $.get(getURL('inject.template.html'), function(data) {
        $("body").append(data);
    });

    $.get(getURL('float.template.html'), function(data) {
        console.log("Boot");
        floatHtmlTemplate = data;
        if(inIframe()) {
            registerHotKeyPassFromIframe();
        } else {
            createAllHotKey();
            registerEvents();
        }
    });

}

function reboot() {
    console.log("Reboot");
    // clear var
    globalCnt = 0;
    activeHotKeyHandler = {};
    // clear html
    $('.injected-dom').remove();
    $('.highlight').removeClass('highlight');
    // reset mousetrap
    if(inIframe()) {
        //
    } else {
        Mousetrap.reset();
        createAllHotKey();
    }
}

$(boot);
