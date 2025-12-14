import getNpmTarballUrl from 'get-npm-tarball-url'

const url = getNpmTarballUrl('@psulek/lhq-generators', '1.0.0-rc.1', {
    registry: 'https://npm.pkg.github.com'
});

console.log(url);