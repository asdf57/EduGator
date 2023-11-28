//Asserts that all passed parameters are non-empty
function assert_all(...params) {
    return params.every(param => {
      if (param === undefined || param === null) {
        return false;
      }

      if (typeof param === 'string' && param.trim().length === 0) {
        return false;
      }

      if (Array.isArray(param) && param.length === 0) {
        return false;
      }

      if (Object.prototype.toString.call(param) === '[object Object]' && Object.keys(param).length === 0) {
        return false;
      }

      return true;
    });
}

module.exports = {
    assert_all
};
