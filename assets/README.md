#Asset Directories

## Structure

```
assets/
  characters/     - Personaje portraits y tokens
    {campaign_id}/
      {character_id}/
        portrait.png
        token.png
  npcs/           - NPC portraits y tokens
    {campaign_id}/
      {npc_id}/
        portrait.png
        token.png
  scenes/         - Scene backgrounds
    {campaign_id}/
      {scene_id}/
        background.png
        music.mp3
        ambience.mp3
  maps/           - Map images
    {campaign_id}/
      {map_id}/
        map.png
        thumbnail.png
        markers.json
  environments/   - Environment textures
    tavern/
      background.png
    forest/
      background.png
    cave/
      background.png
```

## Supported Formats

- Images: PNG, JPG, JPEG, WEBP
- Audio: MP3, WAV, OGG
- Max image size: 10MB
- Max audio size: 50MB
- Min image resolution: 256x256
- Max image resolution: 4096x4096
