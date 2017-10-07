
function bootOthers() {
    if(
        (!inIframe()) &&
        $("#page-navbar nav ul li:last-child").text().indexOf("EBP") != -1 &&
        location.href.indexOf('/course/') != -1
    ) {
        $.get(chrome.extension.getURL('/ebp_hint.template.html'), function(data) {
            $(data).prependTo('.course-content .topics');
        });
    }
}

$(bootOthers);