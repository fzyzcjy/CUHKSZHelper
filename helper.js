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

$.diffByKey = function(arr1, arr2, key) {
    var arr2Key = arr2.map(item => item[key]);
    return arr1.filter(item => arr2Key.indexOf(item[key]) < 0);
}

var StorageHelper = (function(){
    var getKey = (type, id, prefix) => (prefix||'cur') + '-' + type + '-' + (id||0);
    return {
        save(type, id, data, prefix) {
            console.log("StorageSave", type, id, prefix);
            localStorage[getKey(type, id, prefix)] = JSON.stringify(data);
        },
        get(type, id, prefix) {
            try {
                return JSON.parse(localStorage[getKey(type, id, prefix)]);
            } catch(e) {
                return [];
            }
        }
    }
})();

