module.exports = new class Comparator {

    classAndMethodComparator = (a, b) => {
        return  a.Class[0].$.classname == b.Class[0].$.classname &&
                a.Method[0].$.name == b.Method[0].$.name &&
                a.Method[0].$.signature == b.Method[0].$.signature;
    };

    classAndFieldComparator = (a, b) => {
        return  a.Class[0].$.classname == b.Class[0].$.classname &&
                a.Field[0].$.name == b.Field[0].$.name &&
                a.Field[0].$.signature == b.Field[0].$.signature;
    };

    classAndSignatureComparator = (a, b) => {
        if (a.$.type != b.$.type) {
            return false;
        } else if (a.Method != undefined && b.Method != undefined) {
            return this.classAndMethodComparator(a, b);
        } else if (a.Field != undefined && b.Field != undefined) {
            return this.classAndFieldComparator(a, b);
        } else if (a.Field === undefined && b.Field === undefined && a.Method === undefined && b.Method === undefined) {
            return a.Class[0].$.classname == b.Class[0].$.classname;
        } else {
            return false; // a field isn't considered equal to a method
        }
    };
}