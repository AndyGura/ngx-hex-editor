rm -rf dist
ng build ngx-hex-editor
cp README.md dist/ngx-hex-editor
cp -R .github dist/ngx-hex-editor

cd dist/ngx-hex-editor
npm publish
