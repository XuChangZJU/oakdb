const array = [3, 4, 5];

const array2 = array.map(
    async (ele) => {
        const r = await ele * 2;
        return r;
    }
);

console.log(array2.join(','));