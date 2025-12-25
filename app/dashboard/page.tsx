// --- SUBMIT ORDER (The Big Transaction) ---
  const handleSubmitOrder = async () => {
    if (cart.length === 0) return alert("Cart is empty.");
    if (isNewCustomer && !newCustomerEmail.includes('@')) return alert("Invalid email.");

    setIsUploading(true);
    try {
      // 1. Determine User
      // DEFAULT: The user is ordering for themselves (Haleigh)
      let finalUserId = user?.id;
      let finalEmail = user?.email;

      // OVERRIDE: If I am Staff/Admin, did I select someone else?
      if (isInternal) {
          if (isNewCustomer) {
            finalEmail = newCustomerEmail;
            // Note: For guests, finalUserId stays as the Creator (Staff) or null depending on your preference. 
            // Ideally, we keep it as Staff ID so we know who keyed it in, but the Guest Email tracks the client.
          } else if (selectedCustomerId) {
            finalUserId = selectedCustomerId;
            const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
            finalEmail = selectedCustomer?.email || '';
          }
      }

      // 2. Create Parent Order
      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: finalUserId,
          status: 'New',
          brand: orderBrand
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 3. Process Cart Items (Upload & Create Jobs)
      for (const item of cart) {
        // A. Upload File
        const fileExt = item.file.name.split('.').pop();
        const fileName = `${newOrder.id}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { data: fileData, error: uploadError } = await supabase.storage.from('uploads').upload(fileName, item.file);
        
        if (uploadError) console.error("File upload failed for " + item.title, uploadError);

        // B. Create Job linked to Order
        const { data: newJob, error: jobError } = await supabase
          .from('jobs')
          .insert({
            order_id: newOrder.id, // LINK TO PARENT
            user_id: finalUserId, 
            guest_email: isNewCustomer ? finalEmail : null,
            title: item.title,
            quantity: item.quantity,
            notes: item.notes,
            file_url: fileData?.path,
            status: 'Pending Review',
            paper_stock: item.paper_stock,
            assigned_to: null, // Don't auto-assign to staff yet
            csr_name: null,
            brand: orderBrand 
          })
          .select()
          .single();

        if (!jobError && newJob) {
            // C. Create Workflow Step
            await supabase.from('job_steps').insert({
                job_id: newJob.id,
                department: 'Prepress', // Default starting point
                step_order: 1,
                status: 'Pending',
                notes: 'Review files for print'
            });
        }
      }

      // 4. Send One Confirmation Email
      if (finalEmail && newOrder) {
         await sendOrderConfirmation(finalEmail, newOrder.id, `${cart.length} Item(s) from ${orderBrand}`);
      }

      setShowModal(false);
      fetchDashboardData();

    } catch (error) {
      console.error('Error:', error);
      alert('Error creating order. ' + (error as any)?.message);
    } finally {
      setIsUploading(false);
    }
  };
