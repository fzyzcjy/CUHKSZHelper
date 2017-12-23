var bootShimo = (function(){

var HELP_MAP = [
    '字体快捷键',
    ['shift+F1', '加粗黑色 Bold Black'],
    ['shift+F2', '黑色 Black'],
    ['shift+F3', '灰色 Gray'],
    ['F2', '蓝色 Blue'],
    '其他快捷键',
    ['shift+F11', '隐藏/显示顶部条 Hide/Show Top Bars'],
    ['shift+F12', '进入/退出小屏幕优化模式 Enter/Quit Small Screen Optimize Mode'],
]
var HELP_STR = HELP_MAP.map(item => typeof(item)=='string' ? ('\n' + item + '\n') : (item[0] + ': ' + item[1] + '\n')).join('');

function setColor(idx) {
    var $colorList = $("#color-list");
    $colorList.hide();
    $(".new-icon-font-color").click();
    setTimeout(() => {
        $(".font-color-list-item:nth-child("+idx+")").click()
        $colorList.show();
    }, 0);
}

function setBold(isBold) {
    var $bold = $(".new-icon-bold");
    var isCurrentBold = $bold.parent().hasClass('current');
    if(isCurrentBold ^ isBold) {
        $bold.click();
    }
}

function setTextCfg(isBold, isBlack) {
    setBold(isBold);
    setColor(isBlack ? 2 : 11);
}

function toggleDisplay(ele) {
    $(ele).toggle();
}

function onKeyDown(e) {
    var succeed = true;
    if(e.ctrlKey && !e.shiftKey) {
        switch(e.key) {
        case 'F1': setTextCfg(true, true); break;
        case 'F2': setTextCfg(false, true); break;
        case 'F3': setTextCfg(false, false); break;
        default: succeed = false; break;
        }
    } else if(!e.ctrlKey && e.shiftKey) {
        switch(e.key) {
        case 'F11':
            toggleDisplay('#edit-heading');
            toggleDisplay('#header-wrap');
            $('body').toggleClass('css-modify-fullscreen');
            break;
        case 'F12':
            $('body').toggleClass('css-modify');
            break;
        default: succeed = false; break;
        }
    } else if(!e.ctrlKey && !e.shiftKey) {
        switch(e.key) {
        case 'F2': 
            setBold(false);
            setColor(8);
            break;
        default: succeed = false; break;
        }
    } else {
        succeed = false;
    }
    if(succeed) console.log("Action", e.key);
}

function bootShimo() {
    console.log("ShiMo Helper :)");

    executeUntilSucceed(() => {
        $(".fixed-box").hide();
        return $(".fixed-box").length > 0;
    });

    executeUntilSucceed(() => {
        if($("#pad-view").length > 0) {
            $("body").keydown(onKeyDown);
            $("body").append('<div class="show-help">Help</div>');
            $(".show-help").click(() => {
                alert(HELP_STR);
            });
            return true;
        } else {
            return false;
        }
    });
}

return bootShimo;

})();

bootByUrl('shimo.im', bootShimo);