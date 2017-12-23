
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
        case 'F11': toggleDisplay('#edit-heading'); break;
        case 'F12':
            toggleDisplay('#header-wrap');
            $('body').toggleClass('css-modify');
            break;
        default: succeed = false; break;
        }
    } else if(!e.ctrlKey && !e.shiftKey) {
        switch(e.key) {
        case 'F2': 
            setBold(false);
            setColor(42);
            break;
        default: succeed = false; break;
        }
    } else {
        succeed = false;
    }
    if(succeed) console.log("Action", e.key);
}

function executeUntilSucceed(f, timeout) {
    if(!f()) {
        setTimeout(() => {executeUntilSucceed(f);}, timeout || 500);
    }
}

console.log("ShiMo Helper :)");

executeUntilSucceed(() => {
    $(".fixed-box").hide();
    return $(".fixed-box").length > 0;
});

executeUntilSucceed(() => {
    if($("#pad-view").length > 0) {
        $("body").keydown(onKeyDown);
        return true;
    } else {
        return false;
    }
});
