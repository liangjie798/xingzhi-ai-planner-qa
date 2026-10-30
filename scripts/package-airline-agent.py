"""Package only the verified frontend build; exclude all environment files."""
import hashlib, io, json, os, sys, tarfile
from pathlib import Path

source = Path(r'G:\Ai Web\amap-jsapi\frontend')
standalone = source / '.next/standalone'
output = Path(sys.argv[1])
manifest = {'release': '20261030-airline-agent-r6', 'scope': 'frontend',
            'frontendBuildId': (source / '.next/BUILD_ID').read_text().strip()}
output.parent.mkdir(parents=True, exist_ok=True)
with tarfile.open(output, 'w:gz', compresslevel=3) as archive:
    def add(path, target, boundary):
        if path.name.startswith('.env') or path.name in {'.git', '.cache'}:
            return
        if path.is_symlink() or os.path.isjunction(path):
            resolved = path.resolve()
            assert resolved.is_relative_to(boundary.resolve()), 'Link escapes build'
            info = tarfile.TarInfo(target)
            info.type, info.mode = tarfile.SYMTYPE, 0o777
            info.linkname = Path(os.path.relpath(resolved, path.parent)).as_posix()
            archive.addfile(info)
        else:
            archive.add(path, arcname=target, recursive=False)
            if path.is_dir():
                for child in sorted(path.iterdir()):
                    add(child, target + '/' + child.name, boundary)
    add(standalone, 'frontend/.next/standalone', standalone)
    add(source / '.next/static', 'frontend/.next/standalone/.next/static', source / '.next/static')
    add(source / 'public', 'frontend/.next/standalone/public', source / 'public')
    data = json.dumps(manifest, indent=2).encode()
    info = tarfile.TarInfo('release.json')
    info.size, info.mode = len(data), 0o644
    archive.addfile(info, io.BytesIO(data))
with tarfile.open(output) as archive:
    assert not any(Path(item.name).name.startswith('.env') for item in archive.getmembers())
digest = hashlib.sha256(output.read_bytes()).hexdigest()
output.with_suffix(output.suffix + '.sha256').write_text(digest)
print(json.dumps({**manifest, 'archiveBytes': output.stat().st_size, 'archiveSha256': digest}))
