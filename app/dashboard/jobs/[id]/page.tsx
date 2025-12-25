// Replace your existing handleUploadProof function with this:
const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0 || !user) return;
    const file = e.target.files[0];
    const fileName = `${params.id}-proof-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
    
    // 1. Upload File
    const { data, error } = await supabase.storage.from('uploads').upload(fileName, file);
    if (error) return alert("Upload failed");

    // 2. THE KILL SWITCH: Archive ALL existing pending proofs for this job
    await supabase.from('job_assets')
        .update({ status: 'archived' })
        .eq('job_id', params.id)
        .eq('asset_type', 'proof')
        .eq('status', 'pending');

    // 3. Create NEW Asset Record
    await supabase.from('job_assets').insert({
        job_id: params.id,
        uploader_id: user.id,
        file_url: data?.path,
        file_name: file.name,
        asset_type: 'proof',
        status: 'pending' // This becomes the ONLY pending proof
    });

    // 4. Trigger Email Action
    await sendProofNotification(params.id, data?.path || '');

    fetchAssets();
    alert("New proof uploaded. Previous versions archived.");
};
