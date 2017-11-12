
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
        case 'F10': toggleDisplay('#header-wrap'); break;
        case 'F11': toggleDisplay('#edit-heading'); break;
        case 'F12': $('body').toggleClass('css-modify'); break;
        default: succeed = false; break;
        }
    } else if(!e.ctrlKey && e.shiftKey) {
        switch(e.key) {
        default: succeed = false; break;
        }
    } else {
        succeed = false;
    }
    if(succeed) console.log("Action", e.key);
}

function injectDOM() {
    if($(".fixed-box").length == 0) {
        setTimeout(injectDOM, 500);
    } else {
        $(".fixed-box").hide();
        console.log("ShiMo Helper InjectedDOM");
    }
}

console.log("ShiMo Helper Loading");
$(()=>{
    injectDOM();
    $("body").keydown(onKeyDown);
});
