
function traversalTree(callback) {
    var rootData = StorageHelper.get('root');
    callback('root', undefined, rootData);
    for(var rootItem of rootData) {
        var courseData = StorageHelper.get('course', rootItem.id);
        callback('course', rootItem.id, courseData);
        for(var courseItem of courseData) {
            if(courseItem.type == 'folder') {
                var folderData = StorageHelper.get('folder', courseItem.id);
                callback('folder', courseItem.id, folderData, {
                    course: rootItem,
                });
            }
        }
    }
}

function markAllAsRead() {
    for(var key in window.localStorage){
        if(key.startsWith('cur')){
            window.localStorage['old'+key.substr(3)] = window.localStorage[key];
        }
    }
    renderDisplay();
}

function onInjectedDOMReady() {
    initListener();
    renderDisplay();
}

function initListener() {
    stopSpider();
    $("#mh-start-spider").click(startSpider);
    $("#mh-mark-read").click(markAllAsRead);
}

function renderDisplay() {
    showGrp('display');
    var displayArr = [];
    traversalTree(function(type, id, curData, moreInfo) {
        var oldData = StorageHelper.get(type, id, 'old');
        // console.log(type, id, 'cur', curData, 'old', oldData);
        var primaryKey = (type=='folder' ? 'href' : 'id');
        for(var item of $.diffByKey(curData, oldData, primaryKey)) {
            displayArr.push({diffType: 'add', data: item, moreInfo});
        }
        for(var item of $.diffByKey(oldData, curData, primaryKey)) {
            displayArr.push({diffType: 'sub', data: item, moreInfo});
        }
    });
    var $diffInfoUl = $("#mh-diff-info");
    $diffInfoUl.empty();
    const DIFF_TYPE_TO_TEXT = {
        'add': '新增',
        'sub': '删除'
    }
    if(displayArr.length==0) {
        $diffInfoUl.append('<li>Nothing</li>');
    } else {
        for(var item of displayArr) {
            console.log(item);
            var text = '[' + DIFF_TYPE_TO_TEXT[item.diffType] + '] ';
            if(item.moreInfo) {
                text += '<a href="'+ item.moreInfo.course.href + '">' + item.moreInfo.course.name.substr(0,7) + '</a> - ';
            }
            text += '<a href="' + item.data.href + '">' + item.data.name + '</a>';
            $diffInfoUl.append('<li>' + text + '</li>');
        }
    }
}

function boot() {
    if(isAtRootPage()) {
        $.get(chrome.extension.getURL('/index.template.html'), function(data) {
            $(data).prependTo('#frontpage-course-list');
            onInjectedDOMReady();
        });
    }
}

$(boot);