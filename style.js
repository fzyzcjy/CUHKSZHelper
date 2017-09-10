var $_GET = (function(){
    var url = window.document.location.href.toString();
    var u = url.split("?");
    if(typeof(u[1]) == "string"){
        u = u[1].split("&");
        var get = {};
        for(var i in u){
            if(typeof(u[i])=="function")continue;
            var j = u[i].split("=");
            get[j[0]] = j[1];
        }
        return get;
    } else {
        return {};
    }
})();

// https://stackoverflow.com/questions/3442394
$.fn.pureText = function() {
    var text =
        this.clone()    //clone the element
            .children() //select all the children
            .remove()   //remove all the children
            .end()  //again go back to selected element
            .text();
    return text;
}

$.endInt = function(str) {
    return parseInt(str.match(/\d+$/)[0]);
}

var StorageHelper = (function(){
    var getKey = (type, id) => type + '-' + id;
    return {
        save(type, id, data) {
            console.log("StorageSave", type, id, data);
            id = id | 0;
            localStorage[getKey(type, id)] = JSON.stringify(data);
        }
    }
})();

function atRootPage() {
    var courseArr = [];
    $(".coursebox .info .coursename a").each((idx, item) => {
        var $item = $(item);
        courseArr.push({
            id: $.endInt($item.attr('href')),
            name: $item.text(),
        });
    });
    StorageHelper.save('root', undefined, courseArr);
}

function atCourseRootPage() {
    var actionArr = {
        folder($item) {
            console.log('folder', $item.attr('id'));
        },
    };

    var courseId = $_GET['id'];
    var $root = $("section#region-main");
    var dataArr = [];
    $root.find('.activity').each((idx, item) => {
        var $item = $(item);
        for(var actionKey in actionArr) {
            if($item.hasClass(actionKey)) {
                actionArr[actionKey]($item);
                succeed = true; break;
            }
        }
        
        dataArr.push({
            id: $.endInt($item.attr('id')),
            name: $item.find(".instancename").pureText(),
        })
    });

    StorageHelper.save('course', courseId, dataArr);
}

function atFolderPage() {
    var folderId = $_GET['id'];
    var fileInfoArr = [];
    $(".ygtvcontent a").each((idx, item) => {
        var $item = $(item);
        fileInfoArr.push({
            href: $item.attr('href'),
            name: $item.find('.fp-filename').text(),
        });
    });

    StorageHelper.save('folder', folderId, fileInfoArr);
}

function atOtherPage() {
    //
}

function boot() {
    var path = location.pathname;
    if(path == '' || path == '/' || path.startsWith('/index.php')) {
        atRootPage();
    } else if(path.startsWith('/course/view.php')) {
        atCourseRootPage();
    } else if(path.startsWith('/mod/folder/view.php')) {
        atFolderPage();
    } else {
        atOtherPage();
    }
}

boot();