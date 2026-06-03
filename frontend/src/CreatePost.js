// CreatePost.js
import React, { useRef, useState } from "react";
import axios from "axios";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import { API_URL } from "./apiConfig";
import { useNavigate } from "react-router-dom";

function CreatePost() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [newPost, setNewPost] = useState({
        title: "",
        content: "",
        file: null,
    });
    const [status, setStatus] = useState({ type: '', message: '' });

    const handleEditorChange = (data) => {
        setNewPost((currentPost) => ({ ...currentPost, content: data }));
    };

    const handleFileChange = (event) => {
        setNewPost({ ...newPost, file: event.target.files[0] });
    };

    const hasVisibleContent = (html) => {
        const textOnly = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, '').trim();
        return textOnly.length > 0;
    };

    const handlePostSubmit = async () => {
        setStatus({ type: '', message: '' });

        if (!newPost.content || !hasVisibleContent(newPost.content)) {
            setStatus({ type: 'error', message: 'Please add some content before posting.' });
            return;
        }

        const formData = new FormData();
        formData.append("title", newPost.title);
        formData.append("content", newPost.content);
        if (newPost.file) {
            formData.append("file", newPost.file);
        }

        const token = localStorage.getItem('token');
        const config = {
            headers: {
                'Content-Type': 'multipart/form-data',
                'Authorization': token
            }
        };

        try {
            await axios.post(`${API_URL}/api/posts`, formData, config);
            setNewPost({ title: "", content: "", file: null });
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
            setStatus({ type: 'success', message: 'Post created successfully!' });
            navigate('/');
        } catch (error) {
            const message = error.response?.data?.error || 'Unable to create post. Please try again.';
            setStatus({ type: 'error', message });
        }
    };

    return (
        <div className="create-post">
            <h2>Create a Post</h2>
            {/* <input
                type="text"
                name="title"
                placeholder="Title"
                value={newPost.title}
                onChange={handleInputChange}
            /> */}
            <div className="post-editor">
                <CKEditor
                    editor={ClassicEditor}
                    data={newPost.content}
                    config={{
                        placeholder: "Write your post...",
                        toolbar: [
                            "heading",
                            "|",
                            "bold",
                            "italic",
                            "link",
                            "bulletedList",
                            "numberedList",
                            "blockQuote",
                            "|",
                            "undo",
                            "redo"
                        ]
                    }}
                    onChange={(event, editor) => handleEditorChange(editor.getData())}
                />
            </div>
            {status.message && (
                <div className={`status-message ${status.type}`} style={{ marginBottom: '1rem' }}>
                    {status.message}
                </div>
            )}
            <input ref={fileInputRef} type="file" name="file" onChange={handleFileChange} />
            <button onClick={handlePostSubmit}>Post</button>
        </div>
    );
}

export default CreatePost;
