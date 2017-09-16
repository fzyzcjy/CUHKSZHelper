function traversalTree(callback) {
    var displayArr = [];
    var solve = function(type, chainArr, children) {
        var curData = children;
        var oldData = StorageHelper.get(type, (chainArr[chainArr.length-1]||{}).id, 'old');
        var primaryKey = (type=='folder' ? 'href' : 'id');
        for(var item of $.diffByKey(curData, oldData, primaryKey)) {
            displayArr.push({diffType: 'add', data: item, chainArr: chainArr});
        }
        for(var item of $.diffByKey(oldData, curData, primaryKey)) {
            displayArr.push({diffType: 'sub', data: item, chainArr: chainArr});
        }
    };

    var rootChildren = StorageHelper.get('root');
    solve('root', [], rootChildren);
    for(var course of rootChildren) {
        var courseChildren = StorageHelper.get('course', course.id);
        solve('course', [course], courseChildren);
        for(var courseChild of courseChildren) {
            if(courseChild.type == 'folder') {
                var folder = courseChild;
                var folderChildren = StorageHelper.get('folder', folder.id);
                solve('folder', [course, folder], folderChildren);
            }
        }
    }

    return displayArr;
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
    $(".mh-start-spider").click(startSpider);
    $("#mh-mark-read").click(markAllAsRead);
}

function renderDisplay() {
    if(localStorage['inited'] !== 'true') {
        showGrp('init');
    } else {
        showGrp('display');
        var $diffInfoUl = $("#mh-diff-info");
        $diffInfoUl.empty();
        var displayArr = traversalTree();
        const DIFF_TYPE_TO_TEXT = {
            'add': 'NEW',
            'sub': 'DEL'
        }
        if(displayArr.length==0) {
            $diffInfoUl.append('<li>Nothing changed. You can click the *refresh* button below after a while to check what\'s new.</li>');
        } else {
            for(var item of displayArr) {
                var text = '<span class="grey-text">[' + DIFF_TYPE_TO_TEXT[item.diffType] + ']</span> ';
                if(item.diffType=='sub') text += '<del>';
                var fullChainArr = item.chainArr.concat(item.data);
                for(var i = 0;i<fullChainArr.length; ++i) {
                    var chainItem = fullChainArr[i];
                    var isFirst = i == 0;
                    var isLast = i == fullChainArr.length - 1;
                    var innerText = (isFirst)
                        ? chainItem.name.substr(0, 7)
                        : chainItem.name;
                    if(isLast) {
                        var splitArr = innerText.split('|');
                        if(splitArr.length==2) {
                            innerText = splitArr[0] + ' - <b>' + splitArr[1] + '</b>';
                        } else {
                            innerText = '<b>' + innerText + '</b>';
                        }
                    }
                    text +=
                        '<a href="'+ chainItem.href + '">' + innerText + '</a>' + (isLast?'':' - ');
                }
                if(item.diffType=='sub') text += '</del>';
                $diffInfoUl.append('<li>' + text + '</li>');
            }
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