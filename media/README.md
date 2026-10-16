# Media

| File | What it is |
| --- | --- |
| `SafeRoute-deck.pdf` | Pitch deck. Copy of `pitch/deck.pdf`. |
| `demo.mp4` | Demo video, under 3 minutes. Stored with Git LFS. |

Video link (hosted copy): TBD

## Add the video

Git LFS tracks `media/*.mp4` (see `.gitattributes`). GitHub rejects normal files over 100 MB, and LFS avoids that.

```bash
git lfs install
cp /path/to/final.mp4 media/demo.mp4
git add media/demo.mp4 .gitattributes
git commit -m "docs: add demo video"
git push
```

Keep the file under 95 MB so it also plays in the GitHub web viewer and downloads fast. To encode a 1080p H.264 file:

```bash
ffmpeg -i input.mov -vf "scale=-2:1080" -c:v libx264 -preset slow -crf 23 \
  -maxrate 4M -bufsize 8M -c:a aac -b:a 128k -movflags +faststart media/demo.mp4
```

Three minutes at about 4 Mbit/s is about 90 MB. Raise `-crf` to 26 if the file is larger.

If LFS is not available on the clone, upload the video to YouTube (unlisted) or Google Drive and put the link in the line above.
