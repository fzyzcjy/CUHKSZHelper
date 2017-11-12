
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

function onKeyDown(e) {
    if(e.ctrlKey) {
        var succeed = true;
        switch(e.key) {
        case 'F1': setTextCfg(true, true); break;
        case 'F2': setTextCfg(false, true); break;
        case 'F3': setTextCfg(false, false); break;
        default: succeed = false; break;
        }
        if(succeed) {
            console.log("Action", e.key);
        }
    }
}

console.log("ShiMo Helper Loading");
$(()=>{
    $("body").keydown(onKeyDown);
    console.log("ShiMo Helper Loaded");
});
